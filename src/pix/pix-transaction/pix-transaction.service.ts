import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ReceivePixDto } from './dto/receive-pix.dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql, or, and, gte, lte, SQL, desc } from 'drizzle-orm';
import { TransferPixDto } from './dto/transfer-pix.dto';
import { FilterPixTransactionsDto } from './dto/filter-pix-transactions.dto';
import { RefundPixDto } from './dto/refund-pix.dto';
import { bankAccounts, pixKeys, pixTransactions } from '../../db/schema';
import { NotificationService } from '../../notification/notification.service';
import { FraudDetectionService } from '../fraud/fraud-detection.service';
import {
  HistoryResponse,
  HistoryTransaction,
  TransactionDirection,
} from './dto/history-response.dto';

@Injectable()
export class PixTransactionService {
  constructor(
    @Inject('DRIZZLE')
    private readonly db: NodePgDatabase<Record<string, never>>,
    private readonly notificationService: NotificationService,
    private readonly fraudDetection: FraudDetectionService,
  ) {}

  async findAll() {
    return this.db.select().from(pixTransactions);
  }

  async getTransactionsByAccountAndDate(
    bankAccountId: string,
    filterDto: FilterPixTransactionsDto,
  ) {
    if (filterDto.startDate && filterDto.endDate) {
      if (new Date(filterDto.endDate) < new Date(filterDto.startDate)) {
        throw new BadRequestException(
          'endDate não pode ser menor que startDate',
        );
      }
    }

    const conditions: (SQL<unknown> | undefined)[] = [];

    conditions.push(
      or(
        eq(pixTransactions.bankAccountId, bankAccountId),
        eq(pixTransactions.senderAccountId, bankAccountId),
        eq(pixTransactions.receiverAccountId, bankAccountId),
      ),
    );

    if (filterDto.startDate) {
      conditions.push(
        gte(pixTransactions.createdAt, new Date(filterDto.startDate)),
      );
    }

    if (filterDto.endDate) {
      conditions.push(
        lte(pixTransactions.createdAt, new Date(filterDto.endDate)),
      );
    }

    return this.db
      .select()
      .from(pixTransactions)
      .where(and(...conditions))
      .orderBy(pixTransactions.createdAt);
  }

  /**
   * Histórico de transações de uma conta.
   * Retorna todas as operações PIX que passaram pela conta (enviadas,
   * recebidas e cobranças), com o `direction` calculado em relação à
   * conta que está consultando.
   */
  async getHistory(
    bankAccountId: string,
    filterDto: FilterPixTransactionsDto,
  ): Promise<HistoryResponse> {
    if (filterDto.startDate && filterDto.endDate) {
      if (new Date(filterDto.endDate) < new Date(filterDto.startDate)) {
        throw new BadRequestException(
          'endDate não pode ser menor que startDate',
        );
      }
    }

    const [account] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, bankAccountId));

    if (!account) {
      throw new NotFoundException('Conta bancária não encontrada');
    }

    const conditions: (SQL<unknown> | undefined)[] = [];

    conditions.push(
      or(
        eq(pixTransactions.bankAccountId, bankAccountId),
        eq(pixTransactions.senderAccountId, bankAccountId),
        eq(pixTransactions.receiverAccountId, bankAccountId),
      ),
    );

    if (filterDto.startDate) {
      conditions.push(
        gte(pixTransactions.createdAt, new Date(filterDto.startDate)),
      );
    }

    if (filterDto.endDate) {
      conditions.push(
        lte(pixTransactions.createdAt, new Date(filterDto.endDate)),
      );
    }

    const rows = await this.db
      .select()
      .from(pixTransactions)
      .where(and(...conditions))
      .orderBy(desc(pixTransactions.createdAt));

    const transactions: HistoryTransaction[] = rows.map((tx) => {
      const direction = this.resolveDirection(tx, bankAccountId);
      const counterpartAccountId = this.resolveCounterpart(tx, bankAccountId);

      return {
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: tx.amount,
        description: tx.description ?? null,
        direction,
        counterpartAccountId,
        senderAccountId: tx.senderAccountId ?? null,
        receiverAccountId: tx.receiverAccountId ?? null,
        bankAccountId: tx.bankAccountId ?? null,
        createdAt: tx.createdAt,
      };
    });

    return {
      bankAccountId,
      currentBalance: account.balance,
      count: transactions.length,
      transactions,
    };
  }

  private resolveDirection(
    tx: {
      senderAccountId?: string | null;
      receiverAccountId?: string | null;
      bankAccountId?: string | null;
      type: string;
    },
    queriedAccountId: string,
  ): TransactionDirection {
    if (tx.senderAccountId === queriedAccountId) return 'SENT';
    if (tx.receiverAccountId === queriedAccountId) return 'RECEIVED';
    if (tx.bankAccountId === queriedAccountId && tx.type === 'PIX_CHARGE') {
      return 'CHARGE';
    }
    return 'UNKNOWN';
  }

  private resolveCounterpart(
    tx: {
      senderAccountId?: string | null;
      receiverAccountId?: string | null;
    },
    queriedAccountId: string,
  ): string | null {
    if (tx.senderAccountId === queriedAccountId) {
      return tx.receiverAccountId ?? null;
    }
    if (tx.receiverAccountId === queriedAccountId) {
      return tx.senderAccountId ?? null;
    }
    return null;
  }

  async transfer(senderAccountId: string, dto: TransferPixDto) {
    const senderAccount = await this.getSenderAccount(
      senderAccountId,
      dto.amount,
    );
    const receiverPixKey = await this.resolvePixKey(dto.pixKey);
    const receiverAccount = await this.getReceiverAccount(
      receiverPixKey.bankAccountId,
    );

    if (senderAccount.id === receiverAccount.id) {
      throw new BadRequestException('Não é possível transferir para si mesmo');
    }

    if (dto.idempotencyKey) {
      await this.checkIdempotency(dto.idempotencyKey);
    }

    const transaction = await this.db.transaction(async (tx) => {
      await tx
        .update(bankAccounts)
        .set({ balance: sql`balance - ${dto.amount}` })
        .where(eq(bankAccounts.id, senderAccount.id));

      await tx
        .update(bankAccounts)
        .set({ balance: sql`balance + ${dto.amount}` })
        .where(eq(bankAccounts.id, receiverAccount.id));

      const [inserted] = await tx
        .insert(pixTransactions)
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

    const senderNotification = this.notificationService.notify(
      senderAccount.id,
      transaction.id,
      'TRANSFER',
      dto.amount,
      dto.description,
    );

    const receiverNotification = this.notificationService.notify(
      receiverAccount.id,
      transaction.id,
      'RECEIVE',
      dto.amount,
      dto.description,
    );

    let fraudEvaluation: Awaited<
      ReturnType<FraudDetectionService['evaluateTransfer']>
    > | null = null;
    try {
      fraudEvaluation = await this.fraudDetection.evaluateTransfer(transaction);
    } catch {
      // silencioso — o FraudDetectionService já loga internamente
    }

    return {
      transaction,
      notifications: {
        sender: senderNotification,
        receiver: receiverNotification,
      },
      fraudEvaluation,
    };
  }

  async refund(transactionId: string, dto: RefundPixDto = {}) {
    const [transaction] = await this.db
      .select()
      .from(pixTransactions)
      .where(eq(pixTransactions.id, transactionId));

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    if (transaction.status === 'REFUNDED') {
      throw new BadRequestException('Esta transação já foi estornada');
    }

    if (transaction.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Apenas transações concluídas podem ser estornadas',
      );
    }

    const originalAmount = parseFloat(transaction.amount);
    const refundAmount = dto.amount !== undefined ? dto.amount : originalAmount;

    if (refundAmount <= 0 || refundAmount > originalAmount) {
      throw new BadRequestException(
        'O valor do estorno não pode ser maior que o valor original da transação',
      );
    }

    if (transaction.receiverAccountId) {
      const [receiverAccount] = await this.db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.id, transaction.receiverAccountId));

      if (
        receiverAccount &&
        parseFloat(receiverAccount.balance) < refundAmount
      ) {
        throw new BadRequestException(
          'A conta recebedora não possui saldo suficiente para realizar o estorno',
        );
      }
    }

    const reasonText = dto.reason?.trim() || 'Estorno de transação indevida';

    const result = await this.db.transaction(async (tx) => {
      const [refundedTransaction] = await tx
        .update(pixTransactions)
        .set({
          status: 'REFUNDED',
          description: reasonText,
        })
        .where(eq(pixTransactions.id, transactionId))
        .returning();

      if (transaction.senderAccountId) {
        await tx
          .update(bankAccounts)
          .set({ balance: sql`balance + ${refundAmount}` })
          .where(eq(bankAccounts.id, transaction.senderAccountId));
      }

      if (transaction.receiverAccountId) {
        await tx
          .update(bankAccounts)
          .set({ balance: sql`balance - ${refundAmount}` })
          .where(eq(bankAccounts.id, transaction.receiverAccountId));
      }

      return refundedTransaction;
    });

    if (transaction.senderAccountId) {
      this.notificationService.notify(
        transaction.senderAccountId,
        transaction.id,
        'RECEIVE',
        refundAmount,
        `Estorno recebido: ${reasonText}`,
      );
    }

    if (transaction.receiverAccountId) {
      this.notificationService.notify(
        transaction.receiverAccountId,
        transaction.id,
        'TRANSFER',
        refundAmount,
        `Valor estornado: ${reasonText}`,
      );
    }

    return {
      message: 'Estorno de transação realizado com sucesso',
      refundAmount,
      reason: reasonText,
      transaction: result,
    };
  }

  async cancel(transactionId: string) {
    const [transaction] = await this.db
      .select()
      .from(pixTransactions)
      .where(eq(pixTransactions.id, transactionId));

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    if (transaction.status === 'CANCELED') {
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
          await tx
            .update(bankAccounts)
            .set({ balance: sql`balance + ${transaction.amount}` })
            .where(eq(bankAccounts.id, transaction.senderAccountId));
        }

        if (transaction.receiverAccountId) {
          await tx
            .update(bankAccounts)
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
        'CANCELED' as 'TRANSFER',
        Number(transaction.amount),
        'A sua transação foi cancelada',
      );
    }

    if (transaction.receiverAccountId) {
      this.notificationService.notify(
        transaction.receiverAccountId,
        transaction.id,
        'CANCELED' as 'RECEIVE',
        Number(transaction.amount),
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
      await tx
        .update(bankAccounts)
        .set({ balance: sql`balance + ${dto.amount}` })
        .where(eq(bankAccounts.id, pixKey.bankAccountId));

      const [inserted] = await tx
        .insert(pixTransactions)
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
    };
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
      throw new BadRequestException(
        'Conta do remetente está bloqueada ou inativa',
      );
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
      throw new BadRequestException(
        'Conta do destinatário está bloqueada ou inativa',
      );
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
