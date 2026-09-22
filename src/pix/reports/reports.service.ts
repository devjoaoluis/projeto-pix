import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, or, eq, gte, lte, asc } from 'drizzle-orm';

import { users, bankAccounts, pixTransactions, reports } from '../../db/schema';

import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE } from '../../db/db.provider';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly drizzle: NodePgDatabase,
  ) {}

  // POST - Criar relatório do usuário
  async createUserReport(userId: string) {
    const account = await this.getUserAccount(userId);

    const transactions = await this.drizzle
      .select()
      .from(pixTransactions)
      .where(
        or(
          eq(pixTransactions.senderAccountId, account.id),
          eq(pixTransactions.receiverAccountId, account.id),
        ),
      )
      .orderBy(asc(pixTransactions.createdAt));

    const totals = this.calculateTotals(transactions, account.id);

    const [report] = await this.drizzle
      .insert(reports)
      .values({
        userId,
        type: 'USER',
        totalTransactions: transactions.length,
        totalSent: totals.totalSent.toFixed(2),
        totalReceived: totals.totalReceived.toFixed(2),
      })
      .returning();

    return {
      report,
      transactions,
    };
  }

  // POST - Criar relatório por período
  async createPeriodReport(userId: string, startDate: string, endDate: string) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59.999`);

    if (start > end) {
      throw new BadRequestException(
        'A data inicial não pode ser maior que a data final',
      );
    }

    const account = await this.getUserAccount(userId);

    const transactions = await this.drizzle
      .select()
      .from(pixTransactions)
      .where(
        and(
          or(
            eq(pixTransactions.senderAccountId, account.id),
            eq(pixTransactions.receiverAccountId, account.id),
          ),
          gte(pixTransactions.createdAt, start),
          lte(pixTransactions.createdAt, end),
        ),
      )
      .orderBy(asc(pixTransactions.createdAt));

    const totals = this.calculateTotals(transactions, account.id);

    const [report] = await this.drizzle
      .insert(reports)
      .values({
        userId,
        type: 'PERIOD',
        startDate: start,
        endDate: end,
        totalTransactions: transactions.length,
        totalSent: totals.totalSent.toFixed(2),
        totalReceived: totals.totalReceived.toFixed(2),
      })
      .returning();

    return {
      report,
      transactions,
    };
  }

  // GET - Buscar relatório específico
  async getReport(reportId: string) {
    const [report] = await this.drizzle
      .select()
      .from(reports)
      .where(eq(reports.id, reportId));

    if (!report) {
      throw new NotFoundException('Relatório não encontrado');
    }

    return report;
  }

  // GET - Listar relatórios do usuário
  async getReportsByUser(userId: string) {
    const [user] = await this.drizzle
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.drizzle
      .select()
      .from(reports)
      .where(eq(reports.userId, userId))
      .orderBy(asc(reports.createdAt));
  }

  // Métodos auxiliares
  private async getUserAccount(userId: string) {
    const [user] = await this.drizzle
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const [account] = await this.drizzle
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId));

    if (!account) {
      throw new NotFoundException('Conta bancária não encontrada');
    }

    return account;
  }

  private calculateTotals(
    transactions: (typeof pixTransactions.$inferSelect)[],
    accountId: string,
  ) {
    let totalSent = 0;
    let totalReceived = 0;

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);

      if (transaction.senderAccountId === accountId) {
        totalSent += amount;
      }

      if (transaction.receiverAccountId === accountId) {
        totalReceived += amount;
      }
    }

    return {
      totalSent,
      totalReceived,
    };
  }
}
