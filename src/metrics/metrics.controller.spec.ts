import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: {
    getMetrics: jest.Mock;
    getContentType: jest.Mock;
  };

  beforeEach(async () => {
    metricsService = {
      getMetrics: jest.fn(),
      getContentType: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: metricsService,
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  it('deve responder GET /metrics com Content-Type Prometheus e payload das métricas', async () => {
    metricsService.getMetrics.mockResolvedValueOnce(
      '# HELP pix_api_http_requests_total Total\npix_api_http_requests_total 1\n',
    );
    metricsService.getContentType.mockReturnValueOnce(
      'text/plain; version=0.0.4; charset=utf-8',
    );

    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as any;

    await controller.getMetrics(res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/plain; version=0.0.4; charset=utf-8',
    );
    expect(res.send).toHaveBeenCalledWith(
      '# HELP pix_api_http_requests_total Total\npix_api_http_requests_total 1\n',
    );
  });
});
