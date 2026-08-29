import {
  pgTable,
  uuid,
  varchar,
  numeric,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const pixTransactions = pgTable('pix_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: varchar('plan_id', { length: 255 }).notNull(),
  amount: numeric('amount').notNull(),
  description: varchar('description', { length: 255 }),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(),
  pixCode: text('pix_code').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
