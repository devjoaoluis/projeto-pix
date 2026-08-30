import {
  pgTable,
  uuid,
  varchar,
  numeric,
  text,
  boolean,
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

export const contaBancaria = pgTable('contas_bancarias', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  numero: varchar('numero', { length: 20 }).notNull().unique(),
  agencia: varchar('agencia', { length: 10 }).default('0001').notNull(),
  saldo: numeric('saldo').default('0.00').notNull(),
  bloqueada: boolean('bloqueada').default(false).notNull(),
  limiteDiario: numeric('limite_diario').default('10000.00').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});