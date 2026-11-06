import { Injectable, Inject } from '@nestjs/common';
import { and, desc, eq, gte, lte, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { userActivityLogs, users } from '../../db/schema';
import { FilterActivityLogsDto } from './dto/filter-activity-logs.dto';

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
  }) {
    const [newUser] = await this.db
      .insert(users)
      .values({
        name: user.name,
        cpf: user.cpf,
        email: user.email,
        phone: user.phone,
      })
      .returning();

    return newUser;
  }

  async findByCpf(cpf: string) {
    const [user] = await this.db.select().from(users).where(eq(users.cpf, cpf));
    return user;
  }

  async findById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async findAll() {
    return await this.db.select().from(users);
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
}
