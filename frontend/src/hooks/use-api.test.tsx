// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAction, useLookup } from './use-api';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(cleanup);
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, invalidate, wrapper };
}
describe('consultas e ações', () => {
  it('consultar detalhes não invalida o cache nem anuncia uma alteração', async () => {
    const { wrapper, invalidate } = setup();
    const { toast } = await import('sonner');
    vi.mocked(toast.success).mockClear();
    const { result } = renderHook(
      () => useLookup(async (id: string) => ({ id })),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync('id');
    });
    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('entrega a resposta para fechar a confirmação antes de atualizar as queries', async () => {
    const { wrapper, invalidate } = setup();
    const success = vi.fn(() => {
      expect(invalidate).not.toHaveBeenCalled();
    });
    const { result } = renderHook(
      () => useAction(async (value: number) => ({ amount: value }), success),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync(10);
    });
    expect(success).toHaveBeenCalledWith({ amount: 10 });
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
