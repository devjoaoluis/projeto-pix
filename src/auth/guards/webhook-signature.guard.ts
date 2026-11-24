import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

export const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature';

export function computeWebhookSignature(
  payload: string | Buffer,
  secret: string,
): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private getSecret(): string {
    const envSecret = process.env.WEBHOOK_SECRET?.trim();
    if (envSecret) {
      return envSecret;
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'WEBHOOK_SECRET deve ser definido em ambiente de produção',
      );
    }
    return 'dev-pix-webhook-secret-change-me';
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { rawBody?: Buffer }>();
    const rawHeader = req.headers?.[WEBHOOK_SIGNATURE_HEADER];
    const signatureHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!signatureHeader || typeof signatureHeader !== 'string') {
      throw new UnauthorizedException(
        'Assinatura do webhook ausente (cabeçalho x-webhook-signature)',
      );
    }

    const normalizedSignature = signatureHeader
      .trim()
      .replace(/^sha256=/i, '');

    if (!/^[0-9a-f]{64}$/i.test(normalizedSignature)) {
      throw new UnauthorizedException('Assinatura do webhook malformada');
    }

    const payloadBuffer =
      req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
    const expectedHex = computeWebhookSignature(
      payloadBuffer,
      this.getSecret(),
    );

    const providedBuf = Buffer.from(normalizedSignature, 'hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');

    if (
      providedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(providedBuf, expectedBuf)
    ) {
      throw new UnauthorizedException('Assinatura do webhook inválida');
    }

    return true;
  }
}
