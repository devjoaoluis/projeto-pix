import { Injectable, Logger } from '@nestjs/common';

export interface TransactionNotification {
  id: string;
  accountId: string;
  transactionId: string;
  type: 'RECEIVE' | 'TRANSFER' | 'CANCELED' | 'FAILED';
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
    type: TransactionNotification['type'],
    amount: number,
    description?: string,
  ): TransactionNotification {
    const value = amount.toFixed(2).replace('.', ',');
    const message = {
      RECEIVE: `Você recebeu um PIX de R$ ${value}`,
      TRANSFER: `PIX de R$ ${value} enviado com sucesso`,
      FAILED: `PIX agendado de R$ ${value} não foi executado`,
      CANCELED: `PIX de R$ ${value} cancelado`,
    }[type];

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