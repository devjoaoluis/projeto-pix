import {
  pgTable,
  uuid,
  varchar,
  numeric,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const pixTransactions = pgTable('pix_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: varchar('description', { length: 255 }),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(),
  pixCode: text('pix_code').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pixKeys = pgTable(
  'pix_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: varchar('account_id', {
      length: 255,
    }).notNull(),
    key: varchar('key', {
      length: 255,
    }).notNull(),
    type: varchar('type', {
      length: 20,
    }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('pix_key_unique').on(table.key)],
);
