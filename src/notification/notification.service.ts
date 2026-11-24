import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  PaginationQueryDto,
  resolvePagination,
} from '../common/dto/pagination-query.dto';
import { DRIZZLE } from '../db/db.provider';
import { notificationPreferences, notifications } from '../db/schema';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

export type NotificationChannel = 'IN_APP' | 'SMS' | 'EMAIL';

export interface NotificationPreferences {
  accountId: string;
  smsEnabled: boolean;
  emailEnabled: boolean;
  email?: string;
  phone?: string;
  updatedAt: string;
}

export interface TransactionNotification {
  id: string;
  accountId: string;
  transactionId: string;
  type: 'RECEIVE' | 'TRANSFER' | 'CANCELED' | 'FAILED';
  message: string;
  amount: number;
  description?: string;
  channels: NotificationChannel[];
  notifiedAt: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<Record<string, never>>,
  ) {}

  async getPreferences(accountId: string): Promise<NotificationPreferences> {
    const [existing] = await this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.accountId, accountId));

    if (existing) {
      return this.mapPreferences(existing);
    }

    return {
      accountId,
      smsEnabled: false,
      emailEnabled: false,
      updatedAt: new Date().toISOString(),
    };
  }

  async updatePreferences(
    accountId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferences> {
    if (
      dto.smsEnabled === undefined &&
      dto.emailEnabled === undefined &&
      dto.channels === undefined &&
      dto.email === undefined &&
      dto.phone === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos uma preferência de notificação (smsEnabled, emailEnabled ou channels)',
      );
    }

    const current = await this.getPreferences(accountId);

    let smsEnabled = current.smsEnabled;
    let emailEnabled = current.emailEnabled;

    if (dto.channels !== undefined) {
      smsEnabled = dto.channels.includes('SMS');
      emailEnabled = dto.channels.includes('EMAIL');
    }

    if (dto.smsEnabled !== undefined) {
      smsEnabled = dto.smsEnabled;
    }

    if (dto.emailEnabled !== undefined) {
      emailEnabled = dto.emailEnabled;
    }

    const email = dto.email ?? current.email ?? null;
    const phone = dto.phone ?? current.phone ?? null;
    const updatedAt = new Date();

    const [saved] = await this.db
      .insert(notificationPreferences)
      .values({
        accountId,
        smsEnabled,
        emailEnabled,
        email,
        phone,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: notificationPreferences.accountId,
        set: {
          smsEnabled,
          emailEnabled,
          email,
          phone,
          updatedAt,
        },
      })
      .returning();

    this.logger.log(
      `[PREFERÊNCIAS] Conta ${accountId} — SMS: ${smsEnabled ? 'ATIVO' : 'INATIVO'}, Email: ${emailEnabled ? 'ATIVO' : 'INATIVO'}`,
    );

    return this.mapPreferences(saved);
  }

  async enableChannel(
    accountId: string,
    channel: 'SMS' | 'EMAIL',
    destination?: string,
  ): Promise<NotificationPreferences> {
    if (channel === 'SMS') {
      return this.updatePreferences(accountId, {
        smsEnabled: true,
        ...(destination ? { phone: destination } : {}),
      });
    }

    return this.updatePreferences(accountId, {
      emailEnabled: true,
      ...(destination ? { email: destination } : {}),
    });
  }

  async disableChannel(
    accountId: string,
    channel: 'SMS' | 'EMAIL',
  ): Promise<NotificationPreferences> {
    if (channel === 'SMS') {
      return this.updatePreferences(accountId, { smsEnabled: false });
    }

    return this.updatePreferences(accountId, { emailEnabled: false });
  }

  async notify(
    accountId: string,
    transactionId: string,
    type: TransactionNotification['type'],
    amount: number,
    description?: string,
  ): Promise<TransactionNotification> {
    const value = amount.toFixed(2).replace('.', ',');
    const message = {
      RECEIVE: `Você recebeu um PIX de R$ ${value}`,
      TRANSFER: `PIX de R$ ${value} enviado com sucesso`,
      FAILED: `PIX agendado de R$ ${value} não foi executado`,
      CANCELED: `PIX de R$ ${value} cancelado`,
    }[type];

    const prefs = await this.getPreferences(accountId);
    const channels: NotificationChannel[] = ['IN_APP'];

    if (prefs.smsEnabled) {
      channels.push('SMS');
      this.logger.log(
        `[SMS] Enviando SMS para ${prefs.phone ?? accountId}: ${message}`,
      );
    }

    if (prefs.emailEnabled) {
      channels.push('EMAIL');
      this.logger.log(
        `[EMAIL] Enviando e-mail para ${prefs.email ?? accountId}: ${message}`,
      );
    }

    const [inserted] = await this.db
      .insert(notifications)
      .values({
        accountId,
        transactionId,
        type,
        message,
        amount: amount.toFixed(2),
        description: description ?? null,
        channels,
      })
      .returning();

    this.logger.log(
      `[NOTIFICAÇÃO] ${message} — conta: ${accountId} (canais: ${channels.join(', ')})`,
    );

    return this.mapNotification(inserted);
  }

  async getByAccountId(
    accountId: string,
    pagination?: PaginationQueryDto,
  ): Promise<TransactionNotification[]> {
    const { limit, offset } = resolvePagination(pagination);
    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.accountId, accountId))
      .orderBy(desc(notifications.notifiedAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => this.mapNotification(r));
  }

  async getAll(
    pagination?: PaginationQueryDto,
  ): Promise<TransactionNotification[]> {
    const { limit, offset } = resolvePagination(pagination);
    const rows = await this.db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.notifiedAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => this.mapNotification(r));
  }

  private mapPreferences(
    row: typeof notificationPreferences.$inferSelect,
  ): NotificationPreferences {
    return {
      accountId: row.accountId,
      smsEnabled: row.smsEnabled,
      emailEnabled: row.emailEnabled,
      ...(row.email ? { email: row.email } : {}),
      ...(row.phone ? { phone: row.phone } : {}),
      updatedAt:
        row.updatedAt instanceof Date
          ? row.updatedAt.toISOString()
          : String(row.updatedAt),
    };
  }

  private mapNotification(
    row: typeof notifications.$inferSelect,
  ): TransactionNotification {
    return {
      id: row.id,
      accountId: row.accountId,
      transactionId: row.transactionId,
      type: row.type as TransactionNotification['type'],
      message: row.message,
      amount: Number(row.amount),
      ...(row.description ? { description: row.description } : {}),
      channels: (row.channels ?? ['IN_APP']) as NotificationChannel[],
      notifiedAt:
        row.notifiedAt instanceof Date
          ? row.notifiedAt.toISOString()
          : String(row.notifiedAt),
    };
  }
}
