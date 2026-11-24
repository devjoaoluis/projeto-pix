import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const NUMERIC_SEGMENT_REGEX = /\/\d+(?=\/|$)/g;

export function normalizeRoute(req: {
  baseUrl?: string;
  route?: { path?: string };
  path?: string;
  originalUrl?: string;
  url?: string;
}): string {
  if (req.route?.path) {
    const combined = `${req.baseUrl ?? ''}${req.route.path}`;
    return combined.replace(/\/{2,}/g, '/') || '/';
  }

  const rawPath = (req.originalUrl ?? req.path ?? req.url ?? '/').split('?')[0];
  return (
    rawPath
      .replace(UUID_REGEX, ':id')
      .replace(NUMERIC_SEGMENT_REGEX, '/:id')
      .replace(/\/{2,}/g, '/') || '/'
  );
}

@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  private readonly httpRequestsTotal: Counter<'method' | 'route' | 'status_code'>;
  private readonly httpRequestDurationSeconds: Histogram<
    'method' | 'route' | 'status_code'
  >;
  private readonly httpRequestsInFlight: Gauge<'method'>;

  constructor() {
    this.registry = new Registry();

    collectDefaultMetrics({
      register: this.registry,
      prefix: 'pix_api_',
    });

    this.httpRequestsTotal = new Counter({
      name: 'pix_api_http_requests_total',
      help: 'Total de requisições HTTP processadas pela API',
      labelNames: ['method', 'route', 'status_code'] as const,
      registers: [this.registry],
    });

    this.httpRequestDurationSeconds = new Histogram({
      name: 'pix_api_http_request_duration_seconds',
      help: 'Duração das requisições HTTP em segundos',
      labelNames: ['method', 'route', 'status_code'] as const,
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.httpRequestsInFlight = new Gauge({
      name: 'pix_api_http_requests_in_flight',
      help: 'Número de requisições HTTP em andamento',
      labelNames: ['method'] as const,
      registers: [this.registry],
    });
  }

  incrementInFlight(method: string): void {
    this.httpRequestsInFlight.inc({ method: method.toUpperCase() });
  }

  decrementInFlight(method: string): void {
    this.httpRequestsInFlight.dec({ method: method.toUpperCase() });
  }

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    const labels = {
      method: method.toUpperCase(),
      route,
      status_code: String(statusCode),
    };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDurationSeconds.observe(labels, durationSeconds);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
