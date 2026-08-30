import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { pixKeys, bankAccounts } from '../db/schema';
import { CreatePixKeyDto } from './dto/create-pix-key.dto';
import { PixKeyType } from './enums/pix-key-type.enum';
import { randomUUID } from 'crypto';

@Injectable()
export class PixKeyService {
  constructor(
    @Inject('DRIZZLE')
    private readonly db: NodePgDatabase<Record<string, never>>,
  ) {}

  async create(bankAccountId: string, dto: CreatePixKeyDto) {
    const [bankAccount] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, bankAccountId));

    if (!bankAccount) {
      throw new NotFoundException('Conta bancária não encontrada');
    }

    const type = this.getPixKeyType(dto.key);

    const normalizedKey = this.normalizeKey(dto.key, type);

    const existingKey = await this.findByKey(normalizedKey);

    if (existingKey) {
      throw new ConflictException('Esta chave Pix já está cadastrada');
    }

    const [pixKey] = await this.db
      .insert(pixKeys)
      .values({
        bankAccountId,
        key: normalizedKey,
        type,
      })
      .returning();

    return pixKey;
  }

  private normalizeKey(key: string, type: PixKeyType): string {
    switch (type) {
      case PixKeyType.CPF:
      case PixKeyType.CNPJ:
        return key.replace(/\D/g, '');

      case PixKeyType.PHONE:
        return `+${key.replace(/\D/g, '')}`;

      case PixKeyType.EMAIL:
        return key.trim().toLowerCase();

      case PixKeyType.RANDOM:
        return key.trim().toLowerCase();

      default:
        return key.trim();
    }
  }

  private getPixKeyType(key: string): PixKeyType {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (emailRegex.test(key)) {
      return PixKeyType.EMAIL;
    }

    const phoneRegex = /^\+[1-9]\d{1,14}$/;

    if (phoneRegex.test(key)) {
      return PixKeyType.PHONE;
    }

    const cleanDoc = key.replace(/[^\d]/g, '');

    if (cleanDoc.length === 11) {
      return PixKeyType.CPF;
    }

    if (cleanDoc.length === 14) {
      return PixKeyType.CNPJ;
    }

    return PixKeyType.RANDOM;
  }

  async findByAccount(bankAccountId: string) {
    return this.db
      .select()
      .from(pixKeys)
      .where(eq(pixKeys.bankAccountId, bankAccountId));
  }

  async findByKey(key: string) {
    const [pixKey] = await this.db
      .select()
      .from(pixKeys)
      .where(eq(pixKeys.key, key));

    return pixKey;
  }

  async remove(bankAccountId: string, id: string) {
    const [pixKey] = await this.db
      .select()
      .from(pixKeys)
      .where(and(eq(pixKeys.id, id), eq(pixKeys.bankAccountId, bankAccountId)));

    if (!pixKey) {
      throw new NotFoundException('Chave Pix não encontrada');
    }

    await this.db.delete(pixKeys).where(eq(pixKeys.id, id));

    return {
      message: 'Chave Pix removida com sucesso',
    };
  }

  async generateRandomKey(bankAccountId: string) {
    const key = randomUUID();

    const [pixKey] = await this.db
      .insert(pixKeys)
      .values({
        bankAccountId,
        key,
        type: PixKeyType.RANDOM,
      })
      .returning();

    return pixKey;
  }
}
