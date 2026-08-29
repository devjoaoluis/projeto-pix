import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';

export const pixTransactions = pgTable('pix_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: varchar('plan_id', { length: 255 }).notNull(),
  amount: varchar('amount', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(),
  pixCode: varchar('pix_code', { length: 255 }).notNull(),
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