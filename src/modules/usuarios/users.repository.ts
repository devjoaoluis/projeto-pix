import { Injectable, Inject } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, or, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  accountPermissions,
  bankAccounts,
  notificationPreferences,
  notifications,
  pixKeys,
  pixTransactions,
  reports,
  userActivityLogs,
  userContacts,
  users,
} from '../../db/schema';
import { FilterActivityLogsDto } from './dto/filter-activity-logs.dto';
import {
  PaginationQueryDto,
  resolvePagination,
} from '../../common/dto/pagination-query.dto';

@Injectable()
export class UsersRepository {
  constructor(
    @Inject('DRIZZLE')
    private readonly db: NodePgDatabase<Record<string, never>>,
  ) {}

  async create(user: {
    name: string;
    cpf: string;
    email: string;
    phone: string;
    passwordHash?: string | null;
    role?: string;
  }) {
    const [newUser] = await this.db
      .insert(users)
      .values({
        name: user.name,
        cpf: user.cpf,
        email: user.email,
        phone: user.phone,
        ...(user.passwordHash !== undefined
          ? { passwordHash: user.passwordHash }
          : {}),
        ...(user.role !== undefined ? { role: user.role } : {}),
      })
      .returning();

    return newUser;
  }

  async findById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async findByCpf(cpf: string) {
    const [user] = await this.db.select().from(users).where(eq(users.cpf, cpf));
    return user;
  }

  async findAll(pagination?: PaginationQueryDto) {
    const { limit, offset } = resolvePagination(pagination);
    return await this.db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createActivityLog(data: {
    userId: string;
    type: string;
    description: string;
    ipAddress?: string;
    device?: string;
  }) {
    const [log] = await this.db
      .insert(userActivityLogs)
      .values({
        userId: data.userId,
        type: data.type,
        description: data.description,
        ipAddress: data.ipAddress,
        device: data.device,
      })
      .returning();

    return log;
  }

  async findActivitiesByUser(
    userId: string,
    filters: FilterActivityLogsDto = {},
  ) {
    const conditions: (SQL<unknown> | undefined)[] = [
      eq(userActivityLogs.userId, userId),
    ];

    if (filters.type) {
      conditions.push(eq(userActivityLogs.type, filters.type));
    }

    if (filters.startDate) {
      conditions.push(
        gte(userActivityLogs.createdAt, new Date(filters.startDate)),
      );
    }

    if (filters.endDate) {
      conditions.push(
        lte(userActivityLogs.createdAt, new Date(filters.endDate)),
      );
    }

    return this.db
      .select()
      .from(userActivityLogs)
      .where(and(...conditions))
      .orderBy(desc(userActivityLogs.createdAt));
  }

  async update(
    id: string,
    data: Partial<{ name: string; email: string; phone: string }>,
  ) {
    const [updatedUser] = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();

    return updatedUser;
  }

  async remove(id: string) {
    const userAccounts = await this.db
      .select({ id: bankAccounts.id })
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, id));

    const accountIds = userAccounts.map((a) => a.id);

    await this.db
      .delete(accountPermissions)
      .where(eq(accountPermissions.userId, id));

    if (accountIds.length > 0) {
      await this.db
        .delete(accountPermissions)
        .where(inArray(accountPermissions.bankAccountId, accountIds));

      await this.db
        .delete(notifications)
        .where(inArray(notifications.accountId, accountIds));

      await this.db
        .delete(notificationPreferences)
        .where(inArray(notificationPreferences.accountId, accountIds));

      await this.db
        .delete(pixTransactions)
        .where(
          or(
            inArray(pixTransactions.bankAccountId, accountIds),
            inArray(pixTransactions.senderAccountId, accountIds),
            inArray(pixTransactions.receiverAccountId, accountIds),
          ),
        );

      await this.db
        .delete(userContacts)
        .where(inArray(userContacts.contactBankAccountId, accountIds));

      await this.db
        .delete(pixKeys)
        .where(inArray(pixKeys.bankAccountId, accountIds));

      await this.db.delete(bankAccounts).where(eq(bankAccounts.userId, id));
    }

    await this.db
      .delete(userContacts)
      .where(eq(userContacts.ownerUserId, id));

    await this.db
      .delete(userActivityLogs)
      .where(eq(userActivityLogs.userId, id));

    await this.db.delete(reports).where(eq(reports.userId, id));

    const [deletedUser] = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning();

    return deletedUser;
  }
}
