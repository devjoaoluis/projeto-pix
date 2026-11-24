import { MetricsService, normalizeRoute } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  describe('normalizeRoute', () => {
    it('deve usar baseUrl + route.path quando a rota Express estiver resolvida', () => {
      expect(
        normalizeRoute({
          baseUrl: '/users',
          route: { path: '/:id/activities' },
        }),
      ).toBe('/users/:id/activities');
    });

    it('deve normalizar UUIDs e segmentos numéricos para evitar explosão de cardinalidade', () => {
      expect(
        normalizeRoute({
          originalUrl:
            '/bank-accounts/550e8400-e29b-41d4-a716-446655440000/balance?foo=bar',
        }),
      ).toBe('/bank-accounts/:id/balance');

      expect(
        normalizeRoute({
          originalUrl: '/items/12345/details',
        }),
      ).toBe('/items/:id/details');
    });
  });

  it('deve expor métricas padrão do Node.js e métricas HTTP no formato Prometheus', async () => {
    service.incrementInFlight('get');
    service.recordHttpRequest('get', '/health', 200, 0.042);
    service.decrementInFlight('get');

    const output = await service.getMetrics();

    expect(service.getContentType()).toContain('text/plain');
    expect(output).toContain('pix_api_process_cpu_user_seconds_total');
    expect(output).toContain('pix_api_http_requests_total');
    expect(output).toContain(
      'pix_api_http_requests_total{method="GET",route="/health",status_code="200"} 1',
    );
    expect(output).toContain('pix_api_http_request_duration_seconds_bucket');
    expect(output).toContain('pix_api_http_requests_in_flight{method="GET"} 0');
  });
});
