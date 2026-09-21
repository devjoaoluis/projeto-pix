import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, or, eq, gte, lte, asc } from 'drizzle-orm';

import { users, bankAccounts, pixTransactions } from '../../db/schema';

import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE } from '../../db/db.provider';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly drizzle: NodePgDatabase,
  ) {}

  async getTransactionsByUser(userId: string) {
    const account = await this.drizzle
      .select({
        id: bankAccounts.id,
        balance: bankAccounts.balance,
        status: bankAccounts.status,
      })
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId))
      .limit(1);

    if (account.length === 0) {
      throw new NotFoundException('Conta bancária do usuário não encontrada');
    }

    const user = await this.drizzle
      .select({
        id: users.id,
        name: users.name,
        cpf: users.cpf,
        email: users.email,
        phone: users.phone,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const accountId = account[0].id;

    const transactions = await this.drizzle
      .select({
        id: pixTransactions.id,
        amount: pixTransactions.amount,
        description: pixTransactions.description,
        status: pixTransactions.status,
        type: pixTransactions.type,
        pixCode: pixTransactions.pixCode,
        senderAccountId: pixTransactions.senderAccountId,
        receiverAccountId: pixTransactions.receiverAccountId,
        pixKeyId: pixTransactions.pixKeyId,
        createdAt: pixTransactions.createdAt,
      })
      .from(pixTransactions)
      .where(
        or(
          eq(pixTransactions.senderAccountId, accountId),
          eq(pixTransactions.receiverAccountId, accountId),
        ),
      );

    return {
      user: user[0],
      account: account[0],
      summary: {
        totalTransactions: transactions.length,
        totalSent: transactions
          .filter((transaction) => transaction.senderAccountId === accountId)
          .reduce((total, transaction) => total + Number(transaction.amount), 0)
          .toFixed(2),

        totalReceived: transactions
          .filter((transaction) => transaction.receiverAccountId === accountId)
          .reduce((total, transaction) => total + Number(transaction.amount), 0)
          .toFixed(2),
      },
      transactions,
    };
  }

  async getTransactionsByPeriod(
    userId: string,
    startDate: string,
    endDate: string,
  ) {
    const start = new Date(`${startDate}T00:00:00`);

    const end = new Date(`${endDate}T23:59:59.999`);

    if (start > end) {
      throw new BadRequestException(
        'A data inicial não pode ser maior que a data final',
      );
    }

    const user = await this.drizzle
      .select({
        id: users.id,
        name: users.name,
        cpf: users.cpf,
        email: users.email,
        phone: users.phone,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const account = await this.drizzle
      .select({
        id: bankAccounts.id,
        balance: bankAccounts.balance,
        status: bankAccounts.status,
      })
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId))
      .limit(1);

    if (account.length === 0) {
      throw new NotFoundException('Conta bancária do usuário não encontrada');
    }

    const accountId = account[0].id;

    const transactions = await this.drizzle
      .select({
        id: pixTransactions.id,
        amount: pixTransactions.amount,
        description: pixTransactions.description,
        status: pixTransactions.status,
        type: pixTransactions.type,
        pixCode: pixTransactions.pixCode,
        senderAccountId: pixTransactions.senderAccountId,
        receiverAccountId: pixTransactions.receiverAccountId,
        pixKeyId: pixTransactions.pixKeyId,
        createdAt: pixTransactions.createdAt,
      })
      .from(pixTransactions)
      .where(
        and(
          or(
            eq(pixTransactions.senderAccountId, accountId),
            eq(pixTransactions.receiverAccountId, accountId),
          ),

          gte(pixTransactions.createdAt, start),

          lte(pixTransactions.createdAt, end),
        ),
      )
      .orderBy(asc(pixTransactions.createdAt));

    return {
      user: user[0],
      account: account[0],

      period: {
        startDate,
        endDate,
      },

      summary: {
        totalTransactions: transactions.length,

        totalSent: transactions
          .filter((transaction) => transaction.senderAccountId === accountId)
          .reduce((total, transaction) => total + Number(transaction.amount), 0)
          .toFixed(2),

        totalReceived: transactions
          .filter((transaction) => transaction.receiverAccountId === accountId)
          .reduce((total, transaction) => total + Number(transaction.amount), 0)
          .toFixed(2),
      },

      transactions,
    };
  }
}
