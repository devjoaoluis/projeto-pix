import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { pixKeys, userContacts, users } from '../../db/schema';
import { CreatePixContactDto } from './dto/create-pix-contact.dto';
import { UpdatePixContactDto } from './dto/update-pix-contact.dto';

@Injectable()
export class PixContactService {
  constructor(
    @Inject('DRIZZLE')
    private readonly db: NodePgDatabase<Record<string, never>>,
  ) {}

  private async ensureUserExists(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  private async resolveContactPixKey(candidates: string[]) {
    for (const candidate of candidates) {
      const trimmed = candidate.trim();
      if (!trimmed) continue;

      const [foundKey] = await this.db
        .select()
        .from(pixKeys)
        .where(eq(pixKeys.key, trimmed));

      if (foundKey) {
        return foundKey;
      }
    }

    return null;
  }

  async create(userId: string, dto: CreatePixContactDto) {
    await this.ensureUserExists(userId);

    const candidates = [dto.pixKey, dto.phone, dto.email, dto.cpf].filter(
      (val): val is string => Boolean(val && val.trim()),
    );

    if (candidates.length === 0) {
      throw new BadRequestException(
        'Informe uma chave PIX, telefone, e-mail ou CPF do contato',
      );
    }

    const resolvedKey = await this.resolveContactPixKey(candidates);

    if (!resolvedKey) {
      throw new NotFoundException(
        'Nenhuma chave PIX encontrada para os dados informados do contato',
      );
    }

    if (resolvedKey.status && resolvedKey.status !== 'ACTIVE') {
      throw new BadRequestException(
        'A chave PIX informada está suspensa ou bloqueada',
      );
    }

    const [existingContact] = await this.db
      .select()
      .from(userContacts)
      .where(
        and(
          eq(userContacts.ownerUserId, userId),
          eq(userContacts.pixKey, resolvedKey.key),
        ),
      );

    if (existingContact) {
      throw new ConflictException(
        'Este contato já possui esta chave PIX associada na sua agenda',
      );
    }

    const [created] = await this.db
      .insert(userContacts)
      .values({
        ownerUserId: userId,
        name: dto.name.trim(),
        nickname: dto.nickname?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.trim(),
        cpf: dto.cpf?.trim(),
        pixKey: resolvedKey.key,
        pixKeyType: resolvedKey.type,
        pixKeyId: resolvedKey.id,
        contactBankAccountId: resolvedKey.bankAccountId,
      })
      .returning();

    return created;
  }

  async findAllByUser(userId: string) {
    await this.ensureUserExists(userId);

    return this.db
      .select()
      .from(userContacts)
      .where(eq(userContacts.ownerUserId, userId));
  }

  async findById(userId: string, contactId: string) {
    const [contact] = await this.db
      .select()
      .from(userContacts)
      .where(
        and(
          eq(userContacts.id, contactId),
          eq(userContacts.ownerUserId, userId),
        ),
      );

    if (!contact) {
      throw new NotFoundException('Contato não encontrado');
    }

    return contact;
  }

  async syncContacts(userId: string, identifiers: string[]) {
    await this.ensureUserExists(userId);

    if (!Array.isArray(identifiers) || identifiers.length === 0) {
      throw new BadRequestException(
        'Informe ao menos um identificador (telefone, e-mail ou CPF) para sincronizar',
      );
    }

    const matchedKeys: (typeof pixKeys.$inferSelect)[] = [];

    for (const identifier of identifiers) {
      const trimmed = identifier?.trim();
      if (!trimmed) continue;

      const [foundKey] = await this.db
        .select()
        .from(pixKeys)
        .where(eq(pixKeys.key, trimmed));

      if (foundKey && (!foundKey.status || foundKey.status === 'ACTIVE')) {
        matchedKeys.push(foundKey);
      }
    }

    return {
      userId,
      matchedCount: matchedKeys.length,
      pixKeys: matchedKeys,
    };
  }

  async update(userId: string, contactId: string, dto: UpdatePixContactDto) {
    const existing = await this.findById(userId, contactId);

    const updatePayload: Partial<typeof userContacts.$inferInsert> = {};

    if (dto.name !== undefined) {
      updatePayload.name = dto.name.trim();
    }

    if (dto.nickname !== undefined) {
      updatePayload.nickname = dto.nickname.trim();
    }

    if (dto.phone !== undefined) {
      updatePayload.phone = dto.phone.trim();
    }

    if (dto.email !== undefined) {
      updatePayload.email = dto.email.trim();
    }

    if (dto.cpf !== undefined) {
      updatePayload.cpf = dto.cpf.trim();
    }

    if (dto.pixKey !== undefined) {
      const resolvedKey = await this.resolveContactPixKey([dto.pixKey]);
      if (!resolvedKey) {
        throw new NotFoundException(`Chave PIX '${dto.pixKey}' não encontrada`);
      }
      if (resolvedKey.status && resolvedKey.status !== 'ACTIVE') {
        throw new BadRequestException(
          'A chave PIX informada está suspensa ou bloqueada',
        );
      }
      updatePayload.pixKey = resolvedKey.key;
      updatePayload.pixKeyType = resolvedKey.type;
      updatePayload.pixKeyId = resolvedKey.id;
      updatePayload.contactBankAccountId = resolvedKey.bankAccountId;
    }

    if (Object.keys(updatePayload).length === 0) {
      return existing;
    }

    const [updated] = await this.db
      .update(userContacts)
      .set(updatePayload)
      .where(
        and(
          eq(userContacts.id, contactId),
          eq(userContacts.ownerUserId, userId),
        ),
      )
      .returning();

    return updated;
  }

  async remove(userId: string, contactId: string) {
    await this.findById(userId, contactId);

    await this.db
      .delete(userContacts)
      .where(
        and(
          eq(userContacts.id, contactId),
          eq(userContacts.ownerUserId, userId),
        ),
      );

    return { message: 'Contato removido com sucesso' };
  }
}
