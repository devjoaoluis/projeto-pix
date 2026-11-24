import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Params } from 'nestjs-pino';
import { DestinationStream, stdSerializers } from 'pino';
import {
  REDACTED_VALUE,
  maskSensitiveData,
  maskSensitiveString,
} from './sensitive-data.util';

export const REQUEST_ID_HEADER = 'x-request-id';

export const PINO_REDACT_PATHS: string[] = [
  'password',
  'senha',
  'pass',
  'secret',
  'token',
  'authorization',
  'cookie',
  'cpf',
  '*.password',
  '*.senha',
  '*.pass',
  '*.secret',
  '*.token',
  '*.authorization',
  '*.cookie',
  '*.cpf',
  '*.*.password',
  '*.*.senha',
  '*.*.cpf',
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.senha',
  'req.body.cpf',
  'req.query.cpf',
  'req.params.cpf',
];

export function resolveRequestId(
  req: IncomingMessage,
  res: ServerResponse,
): string {
  const headerValue = req.headers?.[REQUEST_ID_HEADER];
  const incomingId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const requestId =
    typeof incomingId === 'string' && incomingId.trim().length > 0
      ? incomingId.trim()
      : randomUUID();

  if (typeof res?.setHeader === 'function') {
    res.setHeader(REQUEST_ID_HEADER, requestId);
  }

  return requestId;
}

export function createLoggerConfig(destination?: DestinationStream): Params {
  return {
    pinoHttp: {
      ...(destination ? { stream: destination } : {}),
      level: process.env.LOG_LEVEL ?? 'info',
      genReqId: resolveRequestId,
      customProps: (req: IncomingMessage & { id?: string | number }) => ({
        requestId: req.id,
      }),
      redact: {
        paths: PINO_REDACT_PATHS,
        censor: REDACTED_VALUE,
      },
      serializers: {
        req(req: any) {
          return {
            id: req.id,
            method: req.method,
            url:
              typeof req.url === 'string'
                ? maskSensitiveString(req.url)
                : req.url,
            query: maskSensitiveData(req.query),
            params: maskSensitiveData(req.params),
            headers: maskSensitiveData(req.headers),
            remoteAddress: req.remoteAddress,
          };
        },
        res(res: any) {
          return {
            statusCode: res.statusCode,
          };
        },
        err(err: any) {
          const serialized = stdSerializers.err(err);
          return {
            ...serialized,
            message:
              typeof serialized.message === 'string'
                ? maskSensitiveString(serialized.message)
                : serialized.message,
            stack:
              typeof serialized.stack === 'string'
                ? maskSensitiveString(serialized.stack)
                : serialized.stack,
          };
        },
      },
      hooks: {
        logMethod(inputArgs: any[], method: (...args: any[]) => void) {
          const maskedArgs = inputArgs.map((arg) => {
            if (typeof arg === 'string') {
              return maskSensitiveString(arg);
            }
            if (arg !== null && typeof arg === 'object') {
              return maskSensitiveData(arg);
            }
            return arg;
          });
          return method.apply(this, maskedArgs);
        },
      },
    },
  };
}
