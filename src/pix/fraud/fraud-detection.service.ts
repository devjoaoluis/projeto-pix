import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gte, ne, sql } from 'drizzle-orm';
import {
  pixTransactions,
  pixKeys,
  bankAccounts,
} from '../../db/schema';
import { BankAccountService } from '../../bank-account/bank-account.service';
import { FRAUD_RULES, FRAUD_BLOCK_THRESHOLD } from './fraud.constants';

export interface FraudEvaluationResult {
  score: number;
  triggeredRules: string[];
  blocked: boolean;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(
    @Inject('DRIZZLE')
    private readonly db: NodePgDatabase<Record<string, never>>,
    private readonly bankAccountService: BankAccountService,
  ) {}

  /**
   * Avalia uma transação recém-criada aplicando as 9 regras de fraude.
   * Se o score passar do limite, bloqueia a conta remetente.
   */
  async evaluateTransfer(transaction: any): Promise<FraudEvaluationResult> {
    const triggeredRules: string[] = [];
    let score = 0;

    const checks: Array<[string, number, () => Promise<boolean> | boolean]> = [
      [
        'HIGH_VOLUME_SHORT_WINDOW',
        FRAUD_RULES.HIGH_VOLUME_SHORT_WINDOW.weight,
        () => this.checkHighVolumeShortWindow(transaction),
      ],
      [
        'HIGH_AMOUNT',
        FRAUD_RULES.HIGH_AMOUNT.weight,
        () => this.checkHighAmount(transaction),
      ],
      [
        'ODD_HOUR_HIGH_AMOUNT',
        FRAUD_RULES.ODD_HOUR_HIGH_AMOUNT.weight,
        () => this.checkOddHourHighAmount(transaction),
      ],
      [
        'STRUCTURING',
        FRAUD_RULES.STRUCTURING.weight,
        () => this.checkStructuring(transaction),
      ],
      [
        'NEW_PIX_KEY',
        FRAUD_RULES.NEW_PIX_KEY.weight,
        () => this.checkNewPixKey(transaction),
      ],
      [
        'BLOCKED_RECEIVER',
        FRAUD_RULES.BLOCKED_RECEIVER.weight,
        () => this.checkBlockedReceiver(transaction),
      ],
      [
        'RAPID_IN_OUT',
        FRAUD_RULES.RAPID_IN_OUT.weight,
        () => this.checkRapidInOut(transaction),
      ],
      [
        'MANY_RECEIVERS',
        FRAUD_RULES.MANY_RECEIVERS.weight,
        () => this.checkManyReceivers(transaction),
      ],
      [
        'SELF_TRANSFER_DIFFERENT_ACCOUNTS',
        FRAUD_RULES.SELF_TRANSFER_DIFFERENT_ACCOUNTS.weight,
        () => this.checkSelfTransferDifferentAccounts(transaction),
      ],
    ];

    for (const [name, weight, fn] of checks) {
      try {
        if (await fn()) {
          triggeredRules.push(name);
          score += weight;
        }
      } catch (err) {
        this.logger.error(`Erro ao avaliar regra ${name}`, err as any);
      }
    }

    const blocked = score >= FRAUD_BLOCK_THRESHOLD;

    if (blocked && transaction.senderAccountId) {
      try {
        await this.bankAccountService.blockForFraud(transaction.senderAccountId, {
          reason: `Detecção automática de fraude. Regras: ${triggeredRules.join(', ')} (score ${score})`,
        });
        this.logger.warn(
          `Conta ${transaction.senderAccountId} bloqueada por fraude. Regras: [${triggeredRules.join(', ')}] score=${score}`,
        );
      } catch (err) {
        this.logger.error(
          `Falha ao bloquear conta ${transaction.senderAccountId}`,
          err as any,
        );
      }
    }

    return { score, triggeredRules, blocked };
  }

  // ---------- Regra 1 ----------
  private async checkHighVolumeShortWindow(tx: any): Promise<boolean> {
    if (!tx.senderAccountId) return false;
    const cfg = FRAUD_RULES.HIGH_VOLUME_SHORT_WINDOW;

    const rows = await this.db
      .select()
      .from(pixTransactions)
      .where(
        and(
          eq(pixTransactions.senderAccountId, tx.senderAccountId),
          eq(pixTransactions.type, 'TRANSFER'),
          gte(
            pixTransactions.createdAt,
            sql`now() - make_interval(mins => ${cfg.windowMinutes})`,
          ),
        ),
      );

    return rows.length >= cfg.maxTransfers;
  }

  // ---------- Regra 2 ----------
  private async checkHighAmount(tx: any): Promise<boolean> {
    const amount = Number(tx.amount);
    const cfg = FRAUD_RULES.HIGH_AMOUNT;

    if (amount >= cfg.threshold) return true;

    // 10x o ticket médio histórico do remetente (se houver histórico)
    if (!tx.senderAccountId) return false;

    const past = await this.db
      .select()
      .from(pixTransactions)
      .where(
        and(
          eq(pixTransactions.senderAccountId, tx.senderAccountId),
          eq(pixTransactions.type, 'TRANSFER'),
          ne(pixTransactions.id, tx.id),
        ),
      );

    if (past.length === 0) return false;

    const avg = past.reduce((s, r) => s + Number(r.amount), 0) / past.length;
    return avg > 0 && amount >= avg * cfg.avgMultiplier;
  }

  // ---------- Regra 3 ----------
  private checkOddHourHighAmount(tx: any): boolean {
    const cfg = FRAUD_RULES.ODD_HOUR_HIGH_AMOUNT;
    const hour = new Date(tx.createdAt).getHours();
    const amount = Number(tx.amount);

    return hour >= cfg.startHour && hour < cfg.endHour && amount > cfg.minAmount;
  }

  // ---------- Regra 4 ----------
  private async checkStructuring(tx: any): Promise<boolean> {
    if (!tx.senderAccountId) return false;
    const cfg = FRAUD_RULES.STRUCTURING;

    const rows = await this.db
      .select()
      .from(pixTransactions)
      .where(
        and(
          eq(pixTransactions.senderAccountId, tx.senderAccountId),
          eq(pixTransactions.type, 'TRANSFER'),
          gte(
            pixTransactions.createdAt,
            sql`now() - make_interval(mins => ${cfg.windowMinutes})`,
          ),
        ),
      );

    if (rows.length < cfg.minTransactions) return false;

    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    if (total < cfg.totalThreshold) return false;

    return rows.every(
      (r) => Number(r.amount) < cfg.totalThreshold * cfg.individualRatio,
    );
  }

  // ---------- Regra 5 ----------
  private async checkNewPixKey(tx: any): Promise<boolean> {
    if (!tx.pixKeyId || !tx.senderAccountId) return false;
    const cfg = FRAUD_RULES.NEW_PIX_KEY;

    const [pixKey] = await this.db
      .select()
      .from(pixKeys)
      .where(eq(pixKeys.id, tx.pixKeyId));

    if (!pixKey) return false;

    const ageMs = Date.now() - new Date(pixKey.createdAt).getTime();
    if (ageMs > cfg.maxAgeHours * 60 * 60 * 1000) return false;

    // Nunca enviou para essa chave antes
    const past = await this.db
      .select()
      .from(pixTransactions)
      .where(
        and(
          eq(pixTransactions.senderAccountId, tx.senderAccountId),
          eq(pixTransactions.pixKeyId, tx.pixKeyId),
          ne(pixTransactions.id, tx.id),
        ),
      );

    return past.length === 0;
  }

  // ---------- Regra 6 ----------
  private async checkBlockedReceiver(tx: any): Promise<boolean> {
    if (!tx.receiverAccountId) return false;

    const [receiver] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, tx.receiverAccountId));

    return receiver?.status === 'BLOCKED';
  }

  // ---------- Regra 7 ----------
  private async checkRapidInOut(tx: any): Promise<boolean> {
    if (!tx.senderAccountId) return false;
    const cfg = FRAUD_RULES.RAPID_IN_OUT;

    const receives = await this.db
      .select()
      .from(pixTransactions)
      .where(
        and(
          eq(pixTransactions.receiverAccountId, tx.senderAccountId),
          eq(pixTransactions.type, 'RECEIVE'),
          gte(
            pixTransactions.createdAt,
            sql`now() - make_interval(mins => ${cfg.windowMinutes})`,
          ),
        ),
      );

    if (receives.length === 0) return false;

    const currentAmount = Number(tx.amount);
    return receives.some((r) => {
      const received = Number(r.amount);
      return received > 0 && currentAmount >= received * cfg.ratio;
    });
  }

  // ---------- Regra 8 ----------
  private async checkManyReceivers(tx: any): Promise<boolean> {
    if (!tx.senderAccountId) return false;
    const cfg = FRAUD_RULES.MANY_RECEIVERS;

    const rows = await this.db
      .select()
      .from(pixTransactions)
      .where(
        and(
          eq(pixTransactions.senderAccountId, tx.senderAccountId),
          eq(pixTransactions.type, 'TRANSFER'),
          gte(
            pixTransactions.createdAt,
            sql`now() - make_interval(mins => ${cfg.windowMinutes})`,
          ),
        ),
      );

    const distinct = new Set(
      rows.map((r) => r.receiverAccountId).filter(Boolean),
    );
    return distinct.size >= cfg.maxDistinct;
  }

  // ---------- Regra 9 ----------
  private async checkSelfTransferDifferentAccounts(tx: any): Promise<boolean> {
    if (!tx.senderAccountId || !tx.receiverAccountId) return false;

    const [sender] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, tx.senderAccountId));
    const [receiver] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, tx.receiverAccountId));

    if (!sender || !receiver) return false;

    // Mesmo userId em contas diferentes = envio para si mesmo
    return sender.userId === receiver.userId && sender.id !== receiver.id;
  }
}