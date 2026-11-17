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

  // Armazena em memória para testes via Postman
  // Em produção, substitua por uma tabela no banco de dados
  private readonly notifications: TransactionNotification[] = [];

  notify(
    accountId: string,
    transactionId: string,
    type: TransactionNotification['type'],
    amount: number,
    description?: string,
  ): TransactionNotification {
    const message =
      type === 'RECEIVE'
        ? `Você recebeu um PIX de R$ ${amount.toFixed(2)}`
        : type === 'TRANSFER'
          ? `PIX de R$ ${amount.toFixed(2)} enviado com sucesso`
          : type === 'FAILED'
            ? `PIX agendado de R$ ${amount.toFixed(2)} não foi executado`
            : `PIX de R$ ${amount.toFixed(2)} cancelado`;

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

    // Salva na lista em memória
    this.notifications.push(notification);

    // Log visível no terminal do servidor
    this.logger.log(`[NOTIFICAÇÃO] ${message} — conta: ${accountId}`);

    // Aqui no futuro você pode chamar: e-mail, push, WebSocket, etc.
    // Ex: await this.mailerService.sendMail({ to: email, subject: message })

    return notification;
  }

  getByAccountId(accountId: string): TransactionNotification[] {
    return this.notifications.filter((n) => n.accountId === accountId);
  }

  getAll(): TransactionNotification[] {
    return this.notifications;
  }
}
