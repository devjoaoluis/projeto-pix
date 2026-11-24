import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  doublePrecision,
  timestamp,
  text,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  cpf: varchar('cpf', { length: 14 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  role: varchar('role', { length: 20 }).default('USER').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userActivityLogs = pgTable(
  'user_activity_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: varchar('type', { length: 50 }).notNull(),
    description: varchar('description', { length: 255 }).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    device: varchar('device', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('user_activity_logs_user_created_at_idx').on(
      table.userId,
      table.createdAt,
    ),
  ],
);

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
    status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
    blockedReason: varchar('blocked_reason', { length: 255 }),
    blockedAt: timestamp('blocked_at'),
    // null = sem limite diário
    dailyLimit: numeric('daily_limit', { precision: 15, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('bank_accounts_user_id_unique').on(table.userId)],
);

export const accountPermissions = pgTable(
  'account_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bankAccountId: uuid('bank_account_id')
      .notNull()
      .references(() => bankAccounts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).default('VIEWER').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('account_permissions_account_user_unique').on(
      table.bankAccountId,
      table.userId,
    ),
  ],
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => bankAccounts.id, { onDelete: 'cascade' }),
    smsEnabled: boolean('sms_enabled').default(false).notNull(),
    emailEnabled: boolean('email_enabled').default(false).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('notification_preferences_account_id_unique').on(
      table.accountId,
    ),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => bankAccounts.id, { onDelete: 'cascade' }),
    transactionId: varchar('transaction_id', { length: 255 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    message: varchar('message', { length: 255 }).notNull(),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    description: varchar('description', { length: 255 }),
    channels: jsonb('channels').$type<string[]>().default(['IN_APP']).notNull(),
    notifiedAt: timestamp('notified_at').defaultNow().notNull(),
  },
  (table) => [
    index('notifications_account_notified_at_idx').on(
      table.accountId,
      table.notifiedAt,
    ),
  ],
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
    status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
    suspendedReason: varchar('suspended_reason', { length: 255 }),
    suspendedAt: timestamp('suspended_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('pix_key_unique').on(table.key)],
);

export const userContacts = pgTable('user_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  nickname: varchar('nickname', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  cpf: varchar('cpf', { length: 14 }),
  pixKey: varchar('pix_key', { length: 255 }).notNull(),
  pixKeyType: varchar('pix_key_type', { length: 20 }).notNull(),
  pixKeyId: uuid('pix_key_id').references(() => pixKeys.id),
  contactBankAccountId: uuid('contact_bank_account_id').references(
    () => bankAccounts.id,
  ),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pixTransactions = pgTable(
  'pix_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bankAccountId: uuid('bank_account_id').references(() => bankAccounts.id),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    description: varchar('description', { length: 255 }),
    status: varchar('status', { length: 50 }).default('PENDING').notNull(),
    pixCode: text('pix_code'),
    senderAccountId: uuid('sender_account_id').references(
      () => bankAccounts.id,
    ),
    receiverAccountId: uuid('receiver_account_id').references(
      () => bankAccounts.id,
    ),
    pixKeyId: uuid('pix_key_id').references(() => pixKeys.id),
    type: varchar('type', { length: 10 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    scheduledAt: timestamp('scheduled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('pix_tx_sender_created_at_idx').on(
      table.senderAccountId,
      table.createdAt,
    ),
    index('pix_tx_receiver_created_at_idx').on(
      table.receiverAccountId,
      table.createdAt,
    ),
    index('pix_tx_status_scheduled_at_idx').on(table.status, table.scheduledAt),
  ],
);

export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),

  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),

  type: varchar('type', { length: 20 }).notNull(),

  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),

  totalTransactions: integer('total_transactions').default(0).notNull(),

  totalSent: numeric('total_sent', {
    precision: 15,
    scale: 2,
  })
    .default('0')
    .notNull(),

  totalReceived: numeric('total_received', {
    precision: 15,
    scale: 2,
  })
    .default('0')
    .notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
