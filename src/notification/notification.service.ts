import { Injectable, Logger } from '@nestjs/common';

export interface TransactionNotification {
  id: string;
  accountId: string;
  transactionId: string;
  type: 'RECEIVE' | 'TRANSFER';
  message: string;
  amount: number;
  description?: string;
  notifiedAt: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  private readonly notifications: TransactionNotification[] = [];

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

    const notification: TransactionNotification = {
      id: crypto.randomUUID(),
      accountId,
      transactionId,
      type,
      message,
      amount,
      description,
      notifiedAt: new Date().toISOString(),
    };

    this.notifications.push(notification);

    this.logger.log(`[NOTIFICAÇÃO] ${message} — conta: ${accountId}`);

    return notification;
  }

  getByAccountId(accountId: string): TransactionNotification[] {
    return this.notifications.filter((n) => n.accountId === accountId);
  }

  getAll(): TransactionNotification[] {
    return this.notifications;
  }
}