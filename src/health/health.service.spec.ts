import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../db/db.provider';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let dbMock: { execute: jest.Mock };

  beforeEach(async () => {
    dbMock = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: DRIZZLE,
          useValue: dbMock,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);
  });

  it('deve retornar status ok quando API e banco estiverem disponíveis', async () => {
    dbMock.execute.mockResolvedValueOnce([{ '?column?': 1 }]);

    const result = await service.check();

    expect(dbMock.execute).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('ok');
    expect(result.checks.api).toEqual({ status: 'up' });
    expect(result.checks.database.status).toBe('up');
    expect(typeof result.checks.database.latencyMs).toBe('number');
    expect(typeof result.uptime).toBe('number');
    expect(Date.parse(result.timestamp)).not.toBeNaN();
  });

  it('deve lançar ServiceUnavailableException (503) quando o banco estiver indisponível', async () => {
    dbMock.execute.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    try {
      await service.check();
      fail('Era esperado lançar ServiceUnavailableException');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      const response = (error as ServiceUnavailableException).getResponse() as any;
      expect(response.status).toBe('error');
      expect(response.checks.api).toEqual({ status: 'up' });
      expect(response.checks.database).toEqual({
        status: 'down',
        error: 'Database connection failed',
      });
    }
  });
});
