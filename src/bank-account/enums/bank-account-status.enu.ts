export enum BankAccountStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  CLOSED = 'CLOSED',
}

export enum BankAccountBlockReason {
  MANUAL = 'MANUAL',
  SUSPECTED_FRAUD = 'SUSPECTED_FRAUD',
}