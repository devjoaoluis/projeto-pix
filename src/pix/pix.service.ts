import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export interface PixTransaction {
  id: string;
  planId: string;
  amount: number;
  status: PaymentStatus;
  pixCode: string; // código copia e cola
  createdAt: Date;
}

@Injectable()
export class PixService {
  private transactions: PixTransaction[] = [];

  generatePix(planId: string, amount: number): PixTransaction {
    const id = randomUUID();

    const pixCode = `00020101021126580014BR.GOV.BCB.PIX0114+55119999999995204000053039865405${amount.toFixed(2)}5802BR5913AcmeInc6008SAOPAULO62070503***6304F1A2`;

    const transaction: PixTransaction = {
      id,
      planId,
      amount,
      status: PaymentStatus.PENDING,
      pixCode,
      createdAt: new Date(),
    };

    this.transactions.push(transaction);
    return transaction;
  }

  getStatus(id: string): PixTransaction {
    const transaction = this.transactions.find((t) => t.id === id);
    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }
    return transaction;
  }

  simulateWebhookEvent(id: string): PixTransaction {
    const transaction = this.getStatus(id);

    // Atualiza o status para pago
    transaction.status = PaymentStatus.PAID;

    return transaction;
  }
}
