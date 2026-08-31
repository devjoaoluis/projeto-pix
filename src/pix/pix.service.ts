import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { pixTransactions, bankAccounts } from '../db/schema';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

@Injectable()
export class PixService {
  constructor(
    @Inject('DRIZZLE')
    private readonly db: NodePgDatabase<Record<string, never>>,
  ) {}

  async generatePix(
    bankAccountId: string,
    amount: number,
    description?: string,
  ) {
    const [bankAccount] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, bankAccountId));

    if (!bankAccount) {
      throw new NotFoundException('Conta bancária não encontrada');
    }

    const pixCode = `00020101021126580014BR.GOV.BCB.PIX0114+55119999999995204000053039865405${amount.toFixed(2)}5802BR5913AcmeInc6008SAOPAULO62070503***6304F1A2`;

    const [transaction] = await this.db
      .insert(pixTransactions)
      .values({
        bankAccountId,
        amount: amount.toString(),
        description,
        pixCode,
        status: PaymentStatus.PENDING,
        type: 'PIX_CHARGE',
      })
      .returning();

    return transaction;
  }

  async getStatus(id: string) {
    const [transaction] = await this.db
      .select()
      .from(pixTransactions)
      .where(eq(pixTransactions.id, id));

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    return transaction;
  }

  async simulateWebhookEvent(id: string) {
    await this.getStatus(id);
    const [updatedTransaction] = await this.db
      .update(pixTransactions)
      .set({ status: PaymentStatus.PAID })
      .where(eq(pixTransactions.id, id))
      .returning();

    return updatedTransaction;
  }
}
