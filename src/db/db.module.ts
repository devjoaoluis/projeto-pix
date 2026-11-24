import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
  Optional,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { dbProvider, PG_POOL, pgPoolProvider } from './db.provider';

@Global()
@Module({
  providers: [pgPoolProvider, dbProvider],
  exports: [pgPoolProvider, dbProvider],
})
export class DbModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DbModule.name);
  private closed = false;

  constructor(@Optional() @Inject(PG_POOL) private readonly pool?: Pool) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    if (!this.pool || this.closed) {
      return;
    }
    this.closed = true;
    this.logger.log(
      `Encerrando pool de conexões PostgreSQL${signal ? ` (${signal})` : ''}...`,
    );
    await this.pool.end();
  }
}
