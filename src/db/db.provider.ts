import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const PG_POOL = 'PG_POOL';
export const DRIZZLE = 'DRIZZLE';

export const pgPoolProvider = {
  provide: PG_POOL,
  useFactory: () => {
    return new Pool({
      connectionString: process.env.DB_URL,
    });
  },
};

export const dbProvider = {
  provide: DRIZZLE,
  inject: [PG_POOL],
  useFactory: (pool: Pool) => {
    return drizzle(pool, { schema });
  },
};
