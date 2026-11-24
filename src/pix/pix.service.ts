import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.provider';
import { bankAccounts, pixKeys, pixTransactions, users } from '../db/schema';
import { NotificationService } from '../notification/notification.service';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

function formatEmvField(id: string, value: string): string {
  const length = Buffer.byteLength(value, 'utf8')
    .toString()
    .padStart(2, '0');
  return `${id}${length}${value}`;
}

export function computeCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildPixBrCode(params: {
  pixKey: string;
  merchantName: string;
  merchantCity?: string;
  amount: number;
  txId: string;
  description?: string;
}): string {
  const cleanAscii = (text: string, maxLen: number) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9 .-]/g, '')
      .trim()
      .slice(0, maxLen) || 'RECEBEDOR PIX';

  const merchantAccountInfo = [
    formatEmvField('00', 'br.gov.bcb.pix'),
    formatEmvField('01', params.pixKey.slice(0, 77)),
    ...(params.description
      ? [formatEmvField('02', cleanAscii(params.description, 50))]
      : []),
  ].join('');

  const cleanTxId =
    params.txId.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const additionalData = formatEmvField('05', cleanTxId);

  const payloadWithoutCrc =
    formatEmvField('00', '01') +
    formatEmvField('01', '12') +
    formatEmvField('26', merchantAccountInfo) +
    formatEmvField('52', '0000') +
    formatEmvField('53', '986') +
    formatEmvField('54', params.amount.toFixed(2)) +
    formatEmvField('58', 'BR') +
    formatEmvField('59', cleanAscii(params.merchantName, 25)) +
    formatEmvField('60', cleanAscii(params.merchantCity ?? 'SAO PAULO', 15)) +
    formatEmvField('62', additionalData) +
    '6304';

  return `${payloadWithoutCrc}${computeCrc16(payloadWithoutCrc)}`;
}

@Injectable()
export class PixService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<Record<string, never>>,
    private readonly notificationService: NotificationService,
  ) {}

  async generatePix(
    bankAccountId: string,
    amount: number,
    description?: string,
  ) {
    const [bankAccount] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, bankAccountId));

    if (!bankAccount) {
      throw new NotFoundException('Conta bancária não encontrada');
    }

    if (bankAccount.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Conta bancária bloqueada ou inativa não pode gerar cobrança Pix',
      );
    }

    const [owner] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, bankAccount.userId));

    const [activePixKey] = await this.db
      .select()
      .from(pixKeys)
      .where(
        and(
          eq(pixKeys.bankAccountId, bankAccountId),
          eq(pixKeys.status, 'ACTIVE'),
        ),
      );

    const txRef = `PIX${Date.now().toString(36).toUpperCase()}`;
    const pixCode = buildPixBrCode({
      pixKey: activePixKey?.key ?? bankAccount.id,
      merchantName: owner?.name ?? 'TITULAR PIX',
      amount,
      txId: txRef,
      description,
    });

    const [transaction] = await this.db
      .insert(pixTransactions)
      .values({
        bankAccountId,
        receiverAccountId: bankAccountId,
        pixKeyId: activePixKey?.id ?? null,
        amount: amount.toFixed(2),
        description,
        pixCode,
        status: PaymentStatus.PENDING,
        type: 'PIX_CHARGE',
      })
      .returning();

    return transaction;
  }

  async getStatus(id: string) {
    const [transaction] = await this.db
      .select()
      .from(pixTransactions)
      .where(eq(pixTransactions.id, id));

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    return transaction;
  }

  async simulateWebhookEvent(id: string) {
    const existing = await this.getStatus(id);

    if (existing.type !== 'PIX_CHARGE') {
      throw new BadRequestException(
        'Apenas cobranças Pix (PIX_CHARGE) podem ter pagamento liquidado por este fluxo',
      );
    }

    if (existing.status === PaymentStatus.PAID) {
      throw new ConflictException('Esta cobrança Pix já foi paga');
    }

    if (existing.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Cobrança com status '${existing.status}' não pode ser paga`,
      );
    }

    const targetAccountId =
      existing.bankAccountId ?? existing.receiverAccountId;
    if (!targetAccountId) {
      throw new BadRequestException(
        'Cobrança Pix sem conta bancária recebedora vinculada',
      );
    }

    const updatedTransaction = await this.db.transaction(async (tx) => {
      const [paid] = await tx
        .update(pixTransactions)
        .set({
          status: PaymentStatus.PAID,
          receiverAccountId: targetAccountId,
        })
        .where(
          and(
            eq(pixTransactions.id, id),
            eq(pixTransactions.status, PaymentStatus.PENDING),
          ),
        )
        .returning();

      if (!paid) {
        throw new ConflictException('Esta cobrança Pix já foi processada');
      }

      await tx
        .update(bankAccounts)
        .set({
          balance: sql`balance + ${existing.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(bankAccounts.id, targetAccountId));

      return paid;
    });

    await this.notificationService.notify(
      targetAccountId,
      updatedTransaction.id,
      'RECEIVE',
      Number(existing.amount),
      existing.description ?? undefined,
    );

    return updatedTransaction;
  }
}
