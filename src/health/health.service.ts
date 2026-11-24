import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.provider';

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  checks: {
    api: {
      status: 'up';
    };
    database: {
      status: 'up' | 'down';
      latencyMs?: number;
      error?: string;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async check(): Promise<HealthCheckResponse> {
    const timestamp = new Date().toISOString();
    const uptime = Number(process.uptime().toFixed(2));
    const startedAt = Date.now();

    try {
      await this.db.execute(sql`SELECT 1`);
      const latencyMs = Date.now() - startedAt;

      return {
        status: 'ok',
        timestamp,
        uptime,
        checks: {
          api: { status: 'up' },
          database: { status: 'up', latencyMs },
        },
      };
    } catch (error) {
      this.logger.error(
        'Falha na verificação de conectividade com o banco de dados',
        error instanceof Error ? error.stack : String(error),
      );

      const payload: HealthCheckResponse = {
        status: 'error',
        timestamp,
        uptime,
        checks: {
          api: { status: 'up' },
          database: {
            status: 'down',
            error: 'Database connection failed',
          },
        },
      };

      throw new ServiceUnavailableException(payload);
    }
  }
}
