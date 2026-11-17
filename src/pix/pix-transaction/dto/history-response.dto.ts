export type TransactionDirection = 'SENT' | 'RECEIVED' | 'CHARGE' | 'UNKNOWN';

export interface HistoryTransaction {
  id: string;
  type: string;
  status: string;
  amount: string;
  description: string | null;
  direction: TransactionDirection;
  counterpartAccountId: string | null;
  senderAccountId: string | null;
  receiverAccountId: string | null;
  bankAccountId: string | null;
  createdAt: Date;
}

export interface HistoryResponse {
  bankAccountId: string;
  currentBalance: string;
  count: number;
  transactions: HistoryTransaction[];
}