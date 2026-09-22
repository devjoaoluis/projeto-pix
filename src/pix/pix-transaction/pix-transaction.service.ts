import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { ReceivePixDto } from "./dto/receive-pix.dto";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, sql, or, and, gte, lte, SQL } from 'drizzle-orm';
import { TransferPixDto } from "./dto/transfer-pix.dto";
import { FilterPixTransactionsDto } from "./dto/filter-pix-transactions.dto";
import { bankAccounts, pixKeys, pixTransactions } from "../../db/schema";
import { NotificationService } from "../../notification/notification.service";

@Injectable()
export class PixTransactionService {
  constructor(
    @Inject('DRIZZLE')
    private readonly db: NodePgDatabase<Record<string, never>>,
    private readonly notificationService: NotificationService,
  )

  async findAll() {
    return this.db.select().from(pixTransactions);
  }

  async getTransactionsByAccountAndDate(bankAccountId: string, filterDto: FilterPixTransactionsDto) {
    if (filterDto.startDate && filterDto.endDate) {
      if (new Date(filterDto.endDate) < new Date(filterDto.startDate)) {
        throw new BadRequestException('endDate não pode ser menor que startDate');
      }
    }

    const conditions: (SQL<unknown> | undefined)[] = [];
    
    conditions.push(
      or(
        eq(pixTransactions.bankAccountId, bankAccountId),
        eq(pixTransactions.senderAccountId, bankAccountId),
        eq(pixTransactions.receiverAccountId, bankAccountId)
      )
    );

    if (filterDto.startDate) {
      conditions.push(gte(pixTransactions.createdAt, new Date(filterDto.startDate)));
    }

    if (filterDto.endDate) {
      conditions.push(lte(pixTransactions.createdAt, new Date(filterDto.endDate)));
    }

    return this.db
      .select()
      .from(pixTransactions)
      .where(and(...conditions))
      .orderBy(pixTransactions.createdAt);
  }


  async transfer(senderAccountId: string, dto: TransferPixDto) {
    const senderAccount = await this.getSenderAccount(senderAccountId, dto.amount);
    const receiverPixKey = await this.resolvePixKey(dto.pixKey);
    const receiverAccount = await this.getReceiverAccount(receiverPixKey.bankAccountId);

    if (senderAccount.id === receiverAccount.id) {
      throw new BadRequestException('Não é possível transferir para si mesmo');
    }

    if (dto.idempotencyKey) {
      await this.checkIdempotency(dto.idempotencyKey);
    }

    const transaction = await this.db.transaction(async (tx) => {
      await tx.update(bankAccounts)
        .set({ balance: sql`balance - ${dto.amount}` })
        .where(eq(bankAccounts.id, senderAccount.id));

      await tx.update(bankAccounts)
        .set({ balance: sql`balance + ${dto.amount}` })
        .where(eq(bankAccounts.id, receiverAccount.id));

      const [inserted] = await tx.insert(pixTransactions)
        .values({
          senderAccountId: senderAccount.id,
          receiverAccountId: receiverAccount.id,
          pixKeyId: receiverPixKey.id,
          amount: dto.amount.toString(),
          description: dto.description,
          status: 'COMPLETED',
          type: 'TRANSFER',
          idempotencyKey: dto.idempotencyKey,
        })
        .returning();

      return inserted;
    });

    // Notifica o remetente que o PIX foi enviado
    const senderNotification = this.notificationService.notify(
      senderAccount.id,
      transaction.id,
      'TRANSFER',
      dto.amount,
      dto.description,
    );

    // Notifica o destinatário que recebeu um PIX
    const receiverNotification = this.notificationService.notify(
      receiverAccount.id,
      transaction.id,
      'RECEIVE',
      dto.amount,
      dto.description,
    );

    return {
      transaction,
      notifications: {
        sender: senderNotification,
        receiver: receiverNotification,
      },
    };
  }  

    async cancel(transactionId: string) {

      const [transaction] = await this.db
        .select()
        .from(picTransactions)
        .where(eq(pixTransactions.id, transcationId));

      if (!transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      if (transaction.status !== 'CANCELED') {
        throw new BadRequestException('Esta transação já está cancelada');
      }

      const result = await this.db.transaction(async (tx) => {

        const [canceledTransaction] = await tx
          .update(pixTransactions)
          .set({ status: 'CANCELED' })
          .where(eq(pixTransactions.id, transactionId))
          .returning();

      if (transaction.status === 'COMPLETED') {
        
        if (transaction.senderAccountId) {
          await tx.update(bankAccounts)
            .set({ balance: sql`balance + ${transaction.amount}` })
            .where(eq(bankAccounts.id, transaction.senderAccountId));
        }
      

        if (transaction.receiverAccountId) {
          await tx.update(bankAccounts)
            .set({ balance: sql`balance - ${transaction.amount}` })
            .where(eq(bankAccounts.id, transaction.receiverAccountId));
        }
      }

      return canceledTransaction;
    });

    if (transaction.senderAccountId) {
      this.notificationService.notify(
        transaction.senderAccountId,
        transaction.id,
        'CANCELED',
        transaction.amount,
        'A sua transação foi cancelada',
      );
    }

    if (transaction.receiverAccountId) {
      this.notificationService.notify(
        transaction.receiverAccountId,
        transaction.id,
        'CANCELED',
        transaction.amount,
        'Transação recebida foi cancelada',
      );
    }

    return {
      message: 'Transação cancelada com sucesso',
      transaction: result,
    };
  }

  async receiveWebhook(dto: ReceivePixDto) {
    const pixKey = await this.resolvePixKey(dto.pixKey);

    const existing = await this.findByExternalId(dto.externalTransactionId);
    if (existing) return existing;

    const transaction = await this.db.transaction(async (tx) => {
      await tx.update(bankAccounts)
        .set({ balance: sql`balance + ${dto.amount}` })
        .where(eq(bankAccounts.id, pixKey.bankAccountId));

      const [inserted] = await tx.insert(pixTransactions)
        .values({
          receiverAccountId: pixKey.bankAccountId,
          pixKeyId: pixKey.id,
          amount: dto.amount.toString(),
          description: dto.description,
          status: 'COMPLETED',
          type: 'RECEIVE',
          idempotencyKey: dto.externalTransactionId,
        })
        .returning();

      return inserted;
    });

    // Notifica a conta que recebeu o PIX via webhook
    const notification = this.notificationService.notify(
      pixKey.bankAccountId,
      transaction.id,
      'RECEIVE',
      dto.amount,
      dto.description,
    );

    return {
      transaction,
      notification,
    }
  }

  private async getSenderAccount(accountId: string, amount: number) {
    const [account] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, accountId));

    if (!account) {
      throw new NotFoundException('Conta do remetente não encontrada');
    }

    if (account.status !== 'ACTIVE') {
      throw new BadRequestException('Conta do remetente está bloqueada ou inativa');
    }

    if (parseFloat(account.balance) < amount) {
      throw new BadRequestException('Saldo insuficiente');
    }

    return account;
  }

  private async resolvePixKey(key: string) {
    const [pixKey] = await this.db
      .select()
      .from(pixKeys)
      .where(eq(pixKeys.key, key));

    if (!pixKey) {
      throw new NotFoundException(`Chave PIX '${key}' não encontrada`);
    }

    return pixKey;
  }

  private async getReceiverAccount(accountId: string) {
    const [account] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, accountId));

    if (!account) {
      throw new NotFoundException('Conta do destinatário não encontrada');
    }

    if (account.status !== 'ACTIVE') {
      throw new BadRequestException('Conta do destinatário está bloqueada ou inativa');
    }

    return account;
  }

  private async checkIdempotency(idempotencyKey: string) {
    const [existing] = await this.db
      .select()
      .from(pixTransactions)
      .where(eq(pixTransactions.idempotencyKey, idempotencyKey));

    if (existing) {
      throw new ConflictException(
        `Transação com idempotencyKey '${idempotencyKey}' já foi processada`,
      );
    }
  }

  private async findByExternalId(externalTransactionId: string) {
    const [transaction] = await this.db
      .select()
      .from(pixTransactions)
      .where(eq(pixTransactions.idempotencyKey, externalTransactionId));

    return transaction;
  }
}
