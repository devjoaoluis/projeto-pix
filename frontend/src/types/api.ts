export interface User {
  id: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  createdAt: string;
}
export interface Account {
  id: string;
  userId: string;
  balance: string;
  status: 'ACTIVE' | 'BLOCKED' | 'CLOSED';
  blockedReason: string | null;
  blockedAt: string | null;
  dailyLimit: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PixKey {
  id: string;
  bankAccountId: string;
  key: string;
  type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  suspendedReason: string | null;
  suspendedAt: string | null;
  createdAt: string;
}
export interface Transaction {
  id: string;
  bankAccountId: string | null;
  senderAccountId: string | null;
  receiverAccountId: string | null;
  amount: string;
  description: string | null;
  type: string;
  status: string;
  pixCode: string | null;
  createdAt: string;
  scheduledAt: string | null;
}
export interface Notification {
  id: string;
  accountId: string;
  transactionId: string;
  type: 'RECEIVE' | 'TRANSFER' | 'CANCELED' | 'FAILED';
  message: string;
  amount: number;
  description?: string;
  notifiedAt: string;
}
export interface Report {
  id: string;
  userId: string;
  type: 'USER' | 'PERIOD';
  startDate: string | null;
  endDate: string | null;
  totalTransactions: number;
  totalSent: string;
  totalReceived: string;
  createdAt: string;
}
export interface ReportResult {
  report: Report;
  transactions: Transaction[];
}
export interface TransferInput {
  pixKey: string;
  amount: number;
  description?: string;
  idempotencyKey: string;
}
