import type { TransferInput } from '@/types/api';
export type TransferDraft = TransferInput & {
  account: string;
  scheduledAt: string;
};
type TransferDetails = Omit<TransferDraft, 'idempotencyKey'>;

// Reabrir a revisão sem mudar a operação preserva a identidade da tentativa.
export function buildTransferDraft(
  details: TransferDetails,
  previous?: TransferDraft,
): TransferDraft {
  const unchanged =
    previous &&
    (Object.keys(details) as (keyof TransferDetails)[]).every(
      (key) => previous[key] === details[key],
    );
  return {
    ...details,
    idempotencyKey: unchanged ? previous.idempotencyKey : crypto.randomUUID(),
  };
}
