// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChargesPage from './charges';
import { api } from '@/services/api';
import type { Transaction } from '@/types/api';

vi.mock('@/services/api', () => ({
  api: { transactions: vi.fn(), chargeStatus: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});
it('para de consultar a cobrança quando o servidor informa PAID', async () => {
  const charge: Transaction = {
    id: '5edb2b95-e0d7-4406-aed0-c469dabd82f4',
    bankAccountId: 'conta',
    senderAccountId: null,
    receiverAccountId: null,
    amount: '10.00',
    description: 'Cobrança',
    type: 'PIX_CHARGE',
    status: 'PENDING',
    pixCode: null,
    createdAt: '2026-11-24T12:00:00Z',
    scheduledAt: null,
  };
  vi.mocked(api.transactions).mockResolvedValue([charge]);
  vi.mocked(api.chargeStatus).mockResolvedValue({ ...charge, status: 'PAID' });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ChargesPage />
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Ver cobrança' }));
  await screen.findByText('Paga');
  expect(api.chargeStatus).toHaveBeenCalledTimes(1);
  vi.useFakeTimers();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30000);
  });
  expect(api.chargeStatus).toHaveBeenCalledTimes(1);
  client.clear();
});
