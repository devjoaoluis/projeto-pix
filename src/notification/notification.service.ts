import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
  type: 'RECEIVE' | 'TRANSFER';
  message: string;
  amount: number;
  description?: string;
  channels: NotificationChannel[];
  notifiedAt: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  private readonly notifications: TransactionNotification[] = [];
  private readonly preferences = new Map<string, NotificationPreferences>();

  getPreferences(accountId: string): NotificationPreferences {
    const existing = this.preferences.get(accountId);
    if (existing) {
      return existing;
    }

    return {
      accountId,
      smsEnabled: false,
      emailEnabled: false,
      updatedAt: new Date().toISOString(),
    };
  }

  updatePreferences(
    accountId: string,
    dto: UpdateNotificationPreferencesDto,
  ): NotificationPreferences {
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

    const current = this.getPreferences(accountId);

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

    const updated: NotificationPreferences = {
      accountId,
      smsEnabled,
      emailEnabled,
      email: dto.email ?? current.email,
      phone: dto.phone ?? current.phone,
      updatedAt: new Date().toISOString(),
    };

    this.preferences.set(accountId, updated);

    this.logger.log(
      `[PREFERÊNCIAS] Conta ${accountId} — SMS: ${smsEnabled ? 'ATIVO' : 'INATIVO'}, Email: ${emailEnabled ? 'ATIVO' : 'INATIVO'}`,
    );

    return updated;
  }

  enableChannel(
    accountId: string,
    channel: 'SMS' | 'EMAIL',
    destination?: string,
  ): NotificationPreferences {
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

  disableChannel(
    accountId: string,
    channel: 'SMS' | 'EMAIL',
  ): NotificationPreferences {
    if (channel === 'SMS') {
      return this.updatePreferences(accountId, { smsEnabled: false });
    }

    return this.updatePreferences(accountId, { emailEnabled: false });
  }

  notify(
    accountId: string,
    transactionId: string,
    type: 'RECEIVE' | 'TRANSFER',
    amount: number,
    description?: string,
  ): TransactionNotification {
    const valorFormatado = amount.toFixed(2).replace('.', ',');

    const message =
      type === 'RECEIVE'
        ? `Você recebeu um PIX de R$ ${valorFormatado}`
        : `PIX de R$ ${valorFormatado} enviado com sucesso`;

    const prefs = this.getPreferences(accountId);
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

    const notification: TransactionNotification = {
      id: crypto.randomUUID(),
      accountId,
      transactionId,
      type,
      message,
      amount,
      description,
      channels,
      notifiedAt: new Date().toISOString(),
    };

    this.notifications.push(notification);

    this.logger.log(
      `[NOTIFICAÇÃO] ${message} — conta: ${accountId} (canais: ${channels.join(', ')})`,
    );

    return notification;
  }

  getByAccountId(accountId: string): TransactionNotification[] {
    return this.notifications.filter((n) => n.accountId === accountId);
  }

  getAll(): TransactionNotification[] {
    return this.notifications;
  }
}
