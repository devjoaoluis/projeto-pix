/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Get,
  INestApplication,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import * as request from 'supertest';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';
import { Public } from '../auth/decorators/auth.decorators';
import {
  PaginationQueryDto,
  resolvePagination,
} from './dto/pagination-query.dto';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

class SamplePayloadDto {
  @IsString()
  name!: string;
}

@Public()
@Controller('items')
class SampleContractController {
  @Get()
  list(@Query() pagination: PaginationQueryDto) {
    return resolvePagination(pagination, 20);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    if (id === '11111111-1111-4111-8111-111111111111') {
      throw Object.assign(new Error('Unique violation'), {
        cause: { code: '23505' },
      });
    }
    if (id === '22222222-2222-4222-8222-222222222222') {
      throw Object.assign(new Error('FK violation'), { code: '23503' });
    }
    if (id === '33333333-3333-4333-8333-333333333333') {
      throw Object.assign(new Error('Invalid text'), { code: '22P02' });
    }
    return { id };
  }

  @Post()
  create(@Body() dto: SamplePayloadDto) {
    return dto;
  }
}

describe('API Validation, Global ExceptionFilter, Pagination & Versioning (/api/v1)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController, SampleContractController],
      providers: [AppService],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: [
        { path: '', method: RequestMethod.GET },
        { path: 'health', method: RequestMethod.GET },
        { path: 'metrics', method: RequestMethod.GET },
      ],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('mantém GET / fora do prefixo /api/v1 e exige /api/v1 nas rotas de domínio', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(/API do Projeto Pix/);

    await request(app.getHttpServer()).get('/items').expect(404);

    const res = await request(app.getHttpServer())
      .get('/api/v1/items?limit=15&offset=5')
      .expect(200);

    expect(res.body).toEqual({ limit: 15, offset: 5 });
  });

  it('valida UUID via ParseUUIDPipe e rejeita propriedades desconhecidas (forbidNonWhitelisted)', async () => {
    const badUuid = await request(app.getHttpServer())
      .get('/api/v1/items/nao-e-uuid')
      .set('x-request-id', 'req-uuid-001')
      .expect(400);

    expect(badUuid.body.statusCode).toBe(400);
    expect(badUuid.body.requestId).toBe('req-uuid-001');
    expect(badUuid.body.timestamp).toBeDefined();

    const extraProp = await request(app.getHttpServer())
      .post('/api/v1/items')
      .send({ name: 'Pix', intruso: true })
      .expect(400);

    expect(JSON.stringify(extraProp.body.message)).toContain('intruso');
  });

  it('mapeia erros PostgreSQL 23505 (409), 23503 (400) e 22P02 (400) no AllExceptionsFilter', async () => {
    const conflict = await request(app.getHttpServer())
      .get('/api/v1/items/11111111-1111-4111-8111-111111111111')
      .set('x-request-id', 'req-pg-23505')
      .expect(409);
    expect(conflict.body.requestId).toBe('req-pg-23505');
    expect(conflict.body.timestamp).toBeDefined();

    await request(app.getHttpServer())
      .get('/api/v1/items/22222222-2222-4222-8222-222222222222')
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/items/33333333-3333-4333-8333-333333333333')
      .expect(400);
  });
});
