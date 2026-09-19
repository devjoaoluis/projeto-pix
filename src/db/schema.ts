import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';


export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  cpf: varchar('cpf', { length: 14 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bankAccounts = pgTable(
  'bank_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    balance: numeric('balance', { precision: 15, scale: 2 })
      .default('0')
      .notNull(),
    status: varchar('status', { length: 20 })
      .default('ACTIVE')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('bank_accounts_user_id_unique').on(table.userId)],
);


export const pixKeys = pgTable(
  'pix_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bankAccountId: uuid('bank_account_id')
      .notNull()
      .references(() => bankAccounts.id),
    key: varchar('key', { length: 255 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('pix_key_unique').on(table.key)],
);


export const pixTransactions = pgTable('pix_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  bankAccountId: uuid('bank_account_id').references(() => bankAccounts.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: varchar('description', { length: 255 }),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(),
  pixCode: text('pix_code'),
  senderAccountId: uuid('sender_account_id').references(() => bankAccounts.id),
  receiverAccountId: uuid('receiver_account_id').references(() => bankAccounts.id),
  pixKeyId: uuid('pix_key_id').references(() => pixKeys.id),
  type: varchar('type', { length: 10 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});