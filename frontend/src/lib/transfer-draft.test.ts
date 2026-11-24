import { describe, expect, it } from 'vitest';
import { buildTransferDraft } from './transfer-draft';

const details = {
  account: 'origem',
  pixKey: 'destino@email.com',
  amount: 10,
  description: 'Pagamento',
  scheduledAt: '',
};
describe('identidade da tentativa de transferência', () => {
  it('preserva a chave ao editar e revisar novamente os mesmos dados', () => {
    const original = buildTransferDraft(details);
    expect(buildTransferDraft({ ...details }, original).idempotencyKey).toBe(
      original.idempotencyKey,
    );
  });
  it.each([
    'account',
    'pixKey',
    'amount',
    'description',
    'scheduledAt',
  ] as const)('gera nova chave quando %s muda', (field) => {
    const original = buildTransferDraft(details);
    const changed = {
      ...details,
      [field]: field === 'amount' ? 20 : 'alterado',
    };
    expect(buildTransferDraft(changed, original).idempotencyKey).not.toBe(
      original.idempotencyKey,
    );
  });
});
