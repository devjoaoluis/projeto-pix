import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { MetricsService, normalizeRoute } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestPath = (req.originalUrl ?? req.url ?? '').split('?')[0];
    if (requestPath === '/metrics') {
      next();
      return;
    }

    const method = req.method || 'UNKNOWN';
    const startTime = process.hrtime.bigint();
    let completed = false;

    this.metricsService.incrementInFlight(method);

    const finalize = (recordStats: boolean) => {
      if (completed) {
        return;
      }
      completed = true;
      this.metricsService.decrementInFlight(method);

      if (recordStats) {
        const durationSeconds =
          Number(process.hrtime.bigint() - startTime) / 1e9;
        const route = normalizeRoute(req);
        this.metricsService.recordHttpRequest(
          method,
          route,
          res.statusCode,
          durationSeconds,
        );
      }
    };

    res.on('finish', () => finalize(true));
    res.on('close', () => finalize(false));

    next();
  }
}
