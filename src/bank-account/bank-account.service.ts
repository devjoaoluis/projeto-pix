import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { accountPermissions, bankAccounts, users } from '../db/schema';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import {
  BankAccountStatus,
  BankAccountBlockReason,
} from './enums/bank-account-status.enu';

import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BlockForFraudDto } from './dto/block-for-fraud.dto';
import { GrantAccountPermissionDto } from './dto/grant-account-permission.dto';

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

  async blockForFraud(id: string, _dto: BlockForFraudDto = {}) {
    const account = await this.findById(id);

    if (
      account.status === BankAccountStatus.BLOCKED &&
      account.blockedReason === BankAccountBlockReason.SUSPECTED_FRAUD
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
      account.status === BankAccountStatus.BLOCKED &&
      account.blockedReason === BankAccountBlockReason.SUSPECTED_FRAUD
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

    const [bankAccount] = await this.db
      .update(bankAccounts)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, id))
      .returning();

    return bankAccount;
  }

  async remove(id: string) {
    await this.findById(id);

    await this.db.delete(bankAccounts).where(eq(bankAccounts.id, id));

    return { message: `Conta bancária ${id} removida com sucesso` };
  }

  // Define o limite diário de transferências da conta
  async updateDailyLimit(id: string, dailyLimit: number) {
    await this.findById(id);

    const [bankAccount] = await this.db
      .update(bankAccounts)
      .set({
        dailyLimit: dailyLimit.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, id))
      .returning();

    return bankAccount;
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

  async getPermissions(accountId: string) {
    const account = await this.findById(accountId);
    const permissions = await this.db
      .select()
      .from(accountPermissions)
      .where(eq(accountPermissions.bankAccountId, accountId));

    return {
      bankAccountId: account.id,
      ownerUserId: account.userId,
      permissions,
    };
  }

  async grantPermission(accountId: string, dto: GrantAccountPermissionDto) {
    const account = await this.findById(accountId);

    if (account.userId === dto.userId) {
      throw new BadRequestException(
        'O titular principal já possui permissão total nesta conta',
      );
    }

    const [targetUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, dto.userId));

    if (!targetUser) {
      throw new NotFoundException('Usuário convidado não encontrado');
    }

    const [existing] = await this.db
      .select()
      .from(accountPermissions)
      .where(
        and(
          eq(accountPermissions.bankAccountId, accountId),
          eq(accountPermissions.userId, dto.userId),
        ),
      );

    if (existing) {
      const [updated] = await this.db
        .update(accountPermissions)
        .set({ role: dto.role })
        .where(eq(accountPermissions.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(accountPermissions)
      .values({
        bankAccountId: accountId,
        userId: dto.userId,
        role: dto.role,
      })
      .returning();

    return created;
  }

  async revokePermission(accountId: string, memberUserId: string) {
    await this.findById(accountId);

    const [deleted] = await this.db
      .delete(accountPermissions)
      .where(
        and(
          eq(accountPermissions.bankAccountId, accountId),
          eq(accountPermissions.userId, memberUserId),
        ),
      )
      .returning();

    if (!deleted) {
      throw new NotFoundException(
        'Permissão não encontrada para este usuário na conta',
      );
    }

    return { message: 'Permissão revogada com sucesso' };
  }
}
