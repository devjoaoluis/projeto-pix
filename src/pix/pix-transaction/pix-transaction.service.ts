import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { ReceivePixDto } from "./dto/receive-pix.dto";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, sql } from 'drizzle-orm';
import { TransferPixDto } from "./dto/transfer-pix.dto";
import { bankAccounts, pixKeys, pixTransactions } from "../../db/schema";

@Injectable()
export class PixTransactionService {
  constructor(
    @Inject('DRIZZLE')
    private readonly db: NodePgDatabase<Record<string, never>>,
  ) { }

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

    return await this.db.transaction(async (tx) => {
      await tx.update(bankAccounts)
        .set({ balance: sql`balance - ${dto.amount}` })
        .where(eq(bankAccounts.id, senderAccount.id));

      await tx.update(bankAccounts)
        .set({ balance: sql`balance + ${dto.amount}` })
        .where(eq(bankAccounts.id, receiverAccount.id));

      const [transaction] = await tx.insert(pixTransactions)
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

      return transaction;
    });
  }

  async receiveWebhook(dto: ReceivePixDto) {
    const pixKey = await this.resolvePixKey(dto.pixKey);
    
    const existing = await this.findByExternalId(dto.externalTransactionId);
    if (existing) return existing;


    return await this.db.transaction(async (tx) => {
      await tx.update(bankAccounts)
        .set({ balance: sql`balance + ${dto.amount}` })
        .where(eq(bankAccounts.id, pixKey.bankAccountId));

      const [transaction] = await tx.insert(pixTransactions)
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

      return transaction;
    });
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
