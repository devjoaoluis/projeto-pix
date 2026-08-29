import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
} from 'drizzle-orm/pg-core';

export const pixTransactions = pgTable('pix_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: varchar('account_id', { length: 255 }),
  amount: numeric('amount').notNull(),
  description: varchar('description', { length: 255 }),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(),
  pixCode: varchar('pix_code', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usuarios = pgTable('usuarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  cpf: varchar('cpf', { length: 14 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  telefone: varchar('telefone', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});