import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { PixKeyType } from './enums/pix-key-type.enum';
import { PixKeyStatus } from './enums/pix-key-status.enum';
import { randomUUID } from 'crypto';
import { CreatePixKeyDto } from './dto/create-pix-key.dto';
import { UpdatePixKeyDto } from './dto/update-pix-key.dto';
import { pixKeys, bankAccounts } from '../../db/schema';

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
        status: PixKeyStatus.ACTIVE,
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

  async findById(id: string) {
    const [pixKey] = await this.db
      .select()
      .from(pixKeys)
      .where(eq(pixKeys.id, id));

    return pixKey;
  }

  async update(bankAccountId: string, id: string, dto: UpdatePixKeyDto) {
    if (
      !dto ||
      (!dto.key && !dto.bankAccountId && !dto.newBankAccountId && !dto.status)
    ) {
      throw new BadRequestException(
        'Pelo menos um campo deve ser informado para atualização',
      );
    }

    const [bankAccount] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, bankAccountId));

    if (!bankAccount) {
      throw new NotFoundException('Conta bancária não encontrada');
    }

    const [pixKey] = await this.db
      .select()
      .from(pixKeys)
      .where(and(eq(pixKeys.id, id), eq(pixKeys.bankAccountId, bankAccountId)));

    if (!pixKey) {
      throw new NotFoundException('Chave Pix não encontrada');
    }

    const fieldsToUpdate: Partial<typeof pixKeys.$inferInsert> = {};

    if (dto.key) {
      const type = this.getPixKeyType(dto.key);
      const normalizedKey = this.normalizeKey(dto.key, type);

      if (normalizedKey !== pixKey.key) {
        const existingKey = await this.findByKey(normalizedKey);
        if (existingKey && existingKey.id !== id) {
          throw new ConflictException('Esta chave Pix já está cadastrada');
        }
        fieldsToUpdate.key = normalizedKey;
        fieldsToUpdate.type = type;
      }
    }

    const targetBankAccountId = dto.newBankAccountId || dto.bankAccountId;
    if (targetBankAccountId && targetBankAccountId !== bankAccountId) {
      const [targetAccount] = await this.db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.id, targetBankAccountId));

      if (!targetAccount) {
        throw new NotFoundException('Nova conta bancária não encontrada');
      }

      fieldsToUpdate.bankAccountId = targetBankAccountId;
    }

    if (dto.status) {
      if (dto.status === PixKeyStatus.ACTIVE) {
        if (bankAccount.status === 'BLOCKED') {
          throw new BadRequestException(
            'Não é possível desbloquear chave Pix vinculada a uma conta bloqueada',
          );
        }
        fieldsToUpdate.status = PixKeyStatus.ACTIVE;
        fieldsToUpdate.suspendedReason = null;
        fieldsToUpdate.suspendedAt = null;
      } else if (
        dto.status === PixKeyStatus.SUSPENDED ||
        dto.status === PixKeyStatus.BLOCKED
      ) {
        fieldsToUpdate.status = PixKeyStatus.SUSPENDED;
        fieldsToUpdate.suspendedReason = 'MANUAL';
        fieldsToUpdate.suspendedAt = new Date();
      }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return pixKey;
    }

    const [updatedPixKey] = await this.db
      .update(pixKeys)
      .set(fieldsToUpdate)
      .where(eq(pixKeys.id, id))
      .returning();

    return updatedPixKey;
  }

  async updateWithoutAccount(id: string, dto: UpdatePixKeyDto) {
    if (
      !dto ||
      (!dto.key && !dto.bankAccountId && !dto.newBankAccountId && !dto.status)
    ) {
      throw new BadRequestException(
        'Pelo menos um campo deve ser informado para atualização',
      );
    }

    const pixKey = await this.findById(id);

    if (!pixKey) {
      throw new NotFoundException('Chave Pix não encontrada');
    }

    return this.update(pixKey.bankAccountId, id, dto);
  }

  async updateRandomKey(bankAccountId: string, id: string) {
    const key = randomUUID();
    return this.update(bankAccountId, id, { key });
  }

  async unblock(bankAccountId: string, id: string) {
    const [bankAccount] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, bankAccountId));

    if (!bankAccount) {
      throw new NotFoundException('Conta bancária não encontrada');
    }

    if (bankAccount.status === 'BLOCKED') {
      throw new BadRequestException(
        'Não é possível desbloquear chave Pix vinculada a uma conta bloqueada',
      );
    }

    const [pixKey] = await this.db
      .select()
      .from(pixKeys)
      .where(and(eq(pixKeys.id, id), eq(pixKeys.bankAccountId, bankAccountId)));

    if (!pixKey) {
      throw new NotFoundException('Chave Pix não encontrada');
    }

    if (pixKey.status !== 'SUSPENDED' && pixKey.status !== 'BLOCKED') {
      throw new BadRequestException('A chave Pix não está suspensa');
    }

    const [updatedPixKey] = await this.db
      .update(pixKeys)
      .set({
        status: PixKeyStatus.ACTIVE,
        suspendedReason: null,
        suspendedAt: null,
      })
      .where(eq(pixKeys.id, id))
      .returning();

    return updatedPixKey;
  }

  async suspend(bankAccountId: string, id: string, reason?: string) {
    const [bankAccount] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, bankAccountId));

    if (!bankAccount) {
      throw new NotFoundException('Conta bancária não encontrada');
    }

    const [pixKey] = await this.db
      .select()
      .from(pixKeys)
      .where(and(eq(pixKeys.id, id), eq(pixKeys.bankAccountId, bankAccountId)));

    if (!pixKey) {
      throw new NotFoundException('Chave Pix não encontrada');
    }

    if (pixKey.status === 'SUSPENDED' || pixKey.status === 'BLOCKED') {
      throw new ConflictException('Chave Pix já está suspensa');
    }

    const [updatedPixKey] = await this.db
      .update(pixKeys)
      .set({
        status: PixKeyStatus.SUSPENDED,
        suspendedReason: reason || 'MANUAL',
        suspendedAt: new Date(),
      })
      .where(eq(pixKeys.id, id))
      .returning();

    return updatedPixKey;
  }

  async unblockWithoutAccount(id: string) {
    const pixKey = await this.findById(id);

    if (!pixKey) {
      throw new NotFoundException('Chave Pix não encontrada');
    }

    return this.unblock(pixKey.bankAccountId, id);
  }

  async suspendWithoutAccount(id: string, reason?: string) {
    const pixKey = await this.findById(id);

    if (!pixKey) {
      throw new NotFoundException('Chave Pix não encontrada');
    }

    return this.suspend(pixKey.bankAccountId, id, reason);
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
        status: PixKeyStatus.ACTIVE,
      })
      .returning();

    return pixKey;
  }
}
