import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
} from 'drizzle-orm/pg-core';

export const pixTransactions = pgTable('pix_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  bankAccountId: uuid('bank_account_id').notNull(),
  amount: numeric('amount').notNull(),
  description: varchar('description', { length: 255 }),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(),
  pixCode: varchar('pix_code', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  cpf: varchar('cpf', { length: 14 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});