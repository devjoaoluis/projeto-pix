import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

function resolveCorsOrigins(): boolean | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    return process.env.NODE_ENV === 'production'
      ? false
      : ['http://localhost:3000', 'http://localhost:3001'];
  }
  if (raw === '*') {
    return true;
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({
    origin: resolveCorsOrigins(),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-request-id',
      'x-webhook-signature',
    ],
    exposedHeaders: ['x-request-id'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
