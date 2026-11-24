import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../../observability/logger.config';

interface PgLikeError {
  code?: string;
  detail?: string;
  cause?: {
    code?: string;
    detail?: string;
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string | number }>();

    const headerReqId = req.headers?.[REQUEST_ID_HEADER];
    const requestId =
      (req.id !== undefined ? String(req.id) : undefined) ??
      (Array.isArray(headerReqId) ? headerReqId[0] : headerReqId) ??
      null;

    const timestamp = new Date().toISOString();
    const path = req.originalUrl ?? req.url;

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const rawResponse = exception.getResponse();

      const body =
        typeof rawResponse === 'object' && rawResponse !== null
          ? {
              statusCode,
              ...rawResponse,
              path,
              requestId,
              timestamp,
            }
          : {
              statusCode,
              error: HttpStatus[statusCode] ?? 'Error',
              message: String(rawResponse),
              path,
              requestId,
              timestamp,
            };

      res.status(statusCode).json(body);
      return;
    }

    const pgCode = this.extractPgCode(exception);
    if (pgCode === '22P02') {
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Formato de identificador ou parâmetro inválido.',
        path,
        requestId,
        timestamp,
      });
      return;
    }

    if (pgCode === '23505') {
      res.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'Registro duplicado: violação de restrição de unicidade.',
        path,
        requestId,
        timestamp,
      });
      return;
    }

    if (pgCode === '23503') {
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message:
          'Referência inválida: registro relacionado não encontrado ou vinculado.',
        path,
        requestId,
        timestamp,
      });
      return;
    }

    this.logger.error(
      `Erro não tratado em ${req.method} ${path}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Erro interno do servidor.',
      path,
      requestId,
      timestamp,
    });
  }

  private extractPgCode(exception: unknown): string | undefined {
    if (!exception || typeof exception !== 'object') {
      return undefined;
    }
    const err = exception as PgLikeError;
    return err.cause?.code ?? err.code;
  }
}
