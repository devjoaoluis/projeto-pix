import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { bankAccounts } from '../db/schema';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import {
  BankAccountStatus,
  BankAccountBlockReason,
} from './enums/bank-account-status.enu';

import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BlockForFraudDto } from './dto/block-for-fraud.dto';

@Injectable()
export class BankAccountService {
  constructor(
    @Inject('DRIZZLE')
    private readonly db: NodePgDatabase<Record<string, never>>,
  ) {}

  async create(dto: CreateBankAccountDto) {
    const [existingAccount] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, dto.userId));

    if (existingAccount) {
      throw new ConflictException('Este usuário já possui uma conta bancária');
    }

    const [bankAccount] = await this.db
      .insert(bankAccounts)
      .values({
        userId: dto.userId,
        balance: '0',
        dailyLimit: '10000.00',
        status: BankAccountStatus.ACTIVE,
      })
      .returning();

    return bankAccount;
  }

  async findAll() {
    return this.db.select().from(bankAccounts);
  }

  async findById(id: string) {
    const [bankAccount] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, id));

    if (!bankAccount) {
      throw new NotFoundException('Conta bancária não encontrada');
    }

    return bankAccount;
  }

  async findByUserId(userId: string) {
    const [bankAccount] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId));

    if (!bankAccount) {
      throw new NotFoundException(
        'Conta bancária não encontrada para este usuário',
      );
    }

    return bankAccount;
  }

  async getBalance(id: string) {
    const bankAccount = await this.findById(id);

    return {
      bankAccountId: bankAccount.id,
      balance: bankAccount.balance,
    };
  }

  async getDailyLimit(id: string) {
    const bankAccount = await this.findById(id);

    return {
      bankAccountId: bankAccount.id,
      dailyLimit: bankAccount.dailyLimit ?? '10000.00',
    };
  }

  async updateDailyLimit(id: string, dailyLimit: number) {
    if (dailyLimit < 0) {
      throw new BadRequestException('O limite diário não pode ser negativo');
    }

    await this.findById(id);

    const [updatedAccount] = await this.db
      .update(bankAccounts)
      .set({
        dailyLimit: dailyLimit.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, id))
      .returning();

    return updatedAccount;
  }

  async block(id: string) {
    await this.findById(id);

    const [bankAccount] = await this.db
      .update(bankAccounts)
      .set({
        status: BankAccountStatus.BLOCKED,
        blockedReason: BankAccountBlockReason.MANUAL,
        blockedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, id))
      .returning();

    return bankAccount;
  }

  async blockForFraud(id: string, dto: BlockForFraudDto = {}) {
    void dto;
    const account = await this.findById(id);

    if (
      account.status === 'BLOCKED' &&
      account.blockedReason === 'SUSPECTED_FRAUD'
    ) {
      throw new ConflictException(
        'Conta já está bloqueada por suspeita de fraude',
      );
    }

    const [bankAccount] = await this.db
      .update(bankAccounts)
      .set({
        status: BankAccountStatus.BLOCKED,
        blockedReason: BankAccountBlockReason.SUSPECTED_FRAUD,
        blockedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, id))
      .returning();

    return bankAccount;
  }

  async activate(id: string) {
    const account = await this.findById(id);

    if (
      account.status === 'BLOCKED' &&
      account.blockedReason === 'SUSPECTED_FRAUD'
    ) {
      throw new BadRequestException(
        'Conta bloqueada por suspeita de fraude não pode ser reativada sem revisão',
      );
    }

    const [bankAccount] = await this.db
      .update(bankAccounts)
      .set({
        status: BankAccountStatus.ACTIVE,
        blockedReason: null,
        blockedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, id))
      .returning();

    return bankAccount;
  }

  // Atualiza somente dados cadastrais
  async update(id: string, dto: UpdateBankAccountDto) {
    await this.findById(id);

    if (Object.keys(dto).length === 0) {
      return this.findById(id);
    }

    const updatePayload: Partial<typeof bankAccounts.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.userId !== undefined) {
      updatePayload.userId = dto.userId;
    }

    if (dto.status !== undefined) {
      updatePayload.status = dto.status;
    }

    if (dto.dailyLimit !== undefined) {
      if (dto.dailyLimit < 0) {
        throw new BadRequestException('O limite diário não pode ser negativo');
      }
      updatePayload.dailyLimit = dto.dailyLimit.toFixed(2);
    }

    const [bankAccount] = await this.db
      .update(bankAccounts)
      .set(updatePayload)
      .where(eq(bankAccounts.id, id))
      .returning();

    return bankAccount;
  }

  async remove(id: string) {
    await this.findById(id);

    await this.db.delete(bankAccounts).where(eq(bankAccounts.id, id));

    return { message: `Conta bancária ${id} removida com sucesso` };
  }

  // Atualiza saldo da conta
  async updateBalance(id: string, amount: number) {
    const bankAccount = await this.findById(id);

    const currentBalance = Number(bankAccount.balance);
    const newBalance = currentBalance + amount;

    if (newBalance < 0) {
      throw new ConflictException('Saldo insuficiente');
    }

    const [updatedAccount] = await this.db
      .update(bankAccounts)
      .set({
        balance: newBalance.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, id))
      .returning();

    return updatedAccount;
  }
}
