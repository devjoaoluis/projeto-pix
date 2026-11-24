import { Writable } from 'stream';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Logger, LoggerModule } from 'nestjs-pino';
import * as request from 'supertest';
import { DbModule } from '../db/db.module';
import { DRIZZLE } from '../db/db.provider';
import { HealthModule } from '../health/health.module';
import { createLoggerConfig } from '../observability/logger.config';
import { MetricsModule } from './metrics.module';

describe('Metrics Endpoint (HTTP)', () => {
  let app: INestApplication;
  let dbMock: { execute: jest.Mock };

  beforeEach(async () => {
    const silentStream = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });

    dbMock = {
      execute: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        DbModule,
        LoggerModule.forRoot(createLoggerConfig(silentStream)),
        HealthModule,
        MetricsModule,
      ],
    })
      .overrideProvider(DRIZZLE)
      .useValue(dbMock)
      .compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(Logger));
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /metrics deve expor métricas Prometheus e contabilizar requisições HTTP feitas à API', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);

    const response = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);

    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('pix_api_http_requests_total');
    expect(response.text).toContain(
      'pix_api_http_requests_total{method="GET",route="/health",status_code="200"} 1',
    );
    expect(response.text).toContain('pix_api_http_request_duration_seconds');
    expect(response.text).toContain('pix_api_process_resident_memory_bytes');
    // O próprio scrape de /metrics não deve ser contabilizado como requisição de negócio
    expect(response.text).not.toContain('route="/metrics"');
  });
});
