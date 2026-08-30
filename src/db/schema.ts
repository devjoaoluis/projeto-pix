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
  bankAccountId: uuid('bank_account_id')
    .notNull()
    .references(() => bankAccounts.id),
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
    bankAccountId: uuid('bank_account_id')
      .notNull()
      .references(() => bankAccounts.id),
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

export const bankAccounts = pgTable(
  'bank_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Futuramente será uma FK para users.id quando acabarem o módulo de Usurios
    //   userId: uuid('user_id')
    // .notNull()
    // .references(() => users.id),
    // Esse código acima é para mudar quando estiver pronto
    userId: uuid('user_id').notNull(),
    balance: numeric('balance', {
      precision: 15,
      scale: 2,
    })
      .default('0')
      .notNull(),
    status: varchar('status', {
      length: 20,
    })
      .default('ACTIVE')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('bank_accounts_user_id_unique').on(table.userId)],
);
