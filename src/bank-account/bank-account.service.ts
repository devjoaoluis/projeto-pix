import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { bankAccounts } from '../db/schema';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { BankAccountStatus } from './enums/bank-account-status.enu';

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
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, id))
      .returning();

    return bankAccount;
  }

  async activate(id: string) {
    await this.findById(id);

    const [bankAccount] = await this.db
      .update(bankAccounts)
      .set({
        status: BankAccountStatus.ACTIVE,
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, id))
      .returning();

    return bankAccount;
  }
}
