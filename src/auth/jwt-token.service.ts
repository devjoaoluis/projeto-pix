import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

export interface JwtUserPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLength), 'base64');
}

@Injectable()
export class JwtTokenService {
  private getSecret(): string {
    const envSecret = process.env.JWT_SECRET?.trim();
    if (envSecret) {
      return envSecret;
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET deve ser definido em ambiente de produção');
    }
    return 'dev-pix-jwt-secret-change-me';
  }

  getExpiresInSeconds(): number {
    const parsed = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 3600);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3600;
  }

  sign(
    payload: Omit<JwtUserPayload, 'iat' | 'exp'>,
    expiresInSeconds = this.getExpiresInSeconds(),
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    );
    const body = base64UrlEncode(
      JSON.stringify({
        ...payload,
        iat: now,
        exp: now + expiresInSeconds,
      }),
    );

    const signingInput = `${header}.${body}`;
    const signature = base64UrlEncode(
      createHmac('sha256', this.getSecret()).update(signingInput).digest(),
    );

    return `${signingInput}.${signature}`;
  }

  verify(token: string): JwtUserPayload {
    const segments = token.split('.');
    if (segments.length !== 3) {
      throw new UnauthorizedException('Token JWT malformado');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = segments;
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSig = createHmac('sha256', this.getSecret())
      .update(signingInput)
      .digest();

    let providedSig: Buffer;
    try {
      providedSig = base64UrlDecode(encodedSignature);
    } catch {
      throw new UnauthorizedException('Assinatura do token JWT inválida');
    }

    if (
      expectedSig.length !== providedSig.length ||
      !timingSafeEqual(expectedSig, providedSig)
    ) {
      throw new UnauthorizedException('Assinatura do token JWT inválida');
    }

    let header: { alg?: string };
    let payload: JwtUserPayload;
    try {
      header = JSON.parse(
        base64UrlDecode(encodedHeader).toString('utf8'),
      ) as { alg?: string };
      payload = JSON.parse(
        base64UrlDecode(encodedPayload).toString('utf8'),
      ) as JwtUserPayload;
    } catch {
      throw new UnauthorizedException('Payload do token JWT inválido');
    }

    if (header.alg !== 'HS256' || !payload?.sub) {
      throw new UnauthorizedException('Token JWT inválido');
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === 'number' && payload.exp < now) {
      throw new UnauthorizedException('Token JWT expirado');
    }

    return payload;
  }
}
