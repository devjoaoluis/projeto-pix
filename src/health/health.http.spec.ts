import { Writable } from 'stream';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Logger, LoggerModule } from 'nestjs-pino';
import * as request from 'supertest';
import { DbModule } from '../db/db.module';
import { DRIZZLE } from '../db/db.provider';
import {
  REQUEST_ID_HEADER,
  createLoggerConfig,
} from '../observability/logger.config';
import { MASKED_CPF, REDACTED_VALUE } from '../observability/sensitive-data.util';
import { HealthModule } from './health.module';

describe('Health & Structured Logging (HTTP)', () => {
  let app: INestApplication;
  let dbMock: { execute: jest.Mock };
  let logLines: string[];

  beforeEach(async () => {
    logLines = [];
    const logStream = new Writable({
      write(chunk, _encoding, callback) {
        const text = chunk.toString().trim();
        if (text) {
          logLines.push(...text.split('\n'));
        }
        callback();
      },
    });

    dbMock = {
      execute: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        DbModule,
        LoggerModule.forRoot(createLoggerConfig(logStream)),
        HealthModule,
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

  it('GET /health deve retornar 200 com checks de API e banco e log JSON com requestId', async () => {
    dbMock.execute.mockResolvedValueOnce([{ '?column?': 1 }]);

    const response = await request(app.getHttpServer())
      .get('/health')
      .set(REQUEST_ID_HEADER, 'trace-health-001')
      .set('Authorization', 'Bearer segredo-jwt')
      .expect(200);

    expect(response.headers[REQUEST_ID_HEADER]).toBe('trace-health-001');
    expect(response.body.status).toBe('ok');
    expect(response.body.checks.api).toEqual({ status: 'up' });
    expect(response.body.checks.database.status).toBe('up');
    expect(typeof response.body.checks.database.latencyMs).toBe('number');

    const httpLogs = logLines
      .map((line) => JSON.parse(line))
      .filter((entry) => entry.requestId === 'trace-health-001');

    expect(httpLogs.length).toBeGreaterThanOrEqual(1);
    const reqLog = httpLogs.find((entry) => entry.res?.statusCode === 200);
    expect(reqLog).toBeDefined();
    expect(reqLog.req.headers.authorization).toBe(REDACTED_VALUE);
    expect(JSON.stringify(reqLog)).not.toContain('segredo-jwt');
  });

  it('GET /health deve retornar 503 quando o banco falhar e propagar requestId nos logs de erro mascarando credenciais/CPF', async () => {
    dbMock.execute.mockRejectedValueOnce(
      new Error(
        'Falha postgresql://root:rootpassword@postgres:5432/banco_pix para CPF 123.456.789-01',
      ),
    );

    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(503);

    const generatedRequestId = response.headers[REQUEST_ID_HEADER];
    expect(generatedRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    expect(response.body.status).toBe('error');
    expect(response.body.checks.api).toEqual({ status: 'up' });
    expect(response.body.checks.database).toEqual({
      status: 'down',
      error: 'Database connection failed',
    });

    const parsedLogs = logLines.map((line) => JSON.parse(line));
    const requestLogs = parsedLogs.filter(
      (entry) => entry.requestId === generatedRequestId,
    );

    // Deve haver log de erro do HealthService e log da resposta HTTP 503 com o mesmo requestId
    expect(requestLogs.length).toBeGreaterThanOrEqual(2);
    const allText = logLines.join('\n');
    expect(allText).not.toContain('rootpassword');
    expect(allText).not.toContain('123.456.789-01');
    expect(allText).toContain(MASKED_CPF);
    expect(allText).toContain(REDACTED_VALUE);
  });
});
