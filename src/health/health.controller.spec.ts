import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckResponse, HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: { check: jest.Mock };

  beforeEach(async () => {
    healthService = {
      check: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: healthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('deve delegar GET /health para HealthService.check()', async () => {
    const expected: HealthCheckResponse = {
      status: 'ok',
      timestamp: '2026-11-23T00:00:00.000Z',
      uptime: 42.5,
      checks: {
        api: { status: 'up' },
        database: { status: 'up', latencyMs: 2 },
      },
    };
    healthService.check.mockResolvedValueOnce(expected);

    const result = await controller.check();

    expect(healthService.check).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expected);
  });
});
