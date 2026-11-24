import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, request, ApiError } from './api';
afterEach(() => vi.unstubAllGlobals());
describe('cliente HTTP da API Pix', () => {
  it('não envia IDs inválidos para consultas de cobrança e relatório', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(api.chargeStatus('qualquer texto')).rejects.toMatchObject({
      status: 400,
    });
    await expect(api.report('../users')).rejects.toMatchObject({ status: 400 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('traduz falhas internas e tolera mensagens de erro malformadas', async () => {
    for (const message of [
      'Internal server error',
      { unexpected: true },
      [null, 5],
    ]) {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ message }), { status: 500 }),
          ),
      );
      await expect(request('/bank-accounts')).rejects.toMatchObject({
        status: 500,
        messages: [
          'Não foi possível concluir a operação no servidor. Confira a API e a configuração do banco de dados.',
        ],
      });
    }
  });
  it('apresenta uma mensagem clara quando o prazo de resposta termina', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')),
    );
    await expect(request('/users')).rejects.toMatchObject({
      status: 0,
      messages: ['A API demorou para responder. Tente novamente em instantes.'],
    });
  });
  it('preserva as mensagens de validação do NestJS', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ message: ['CPF inválido', 'Nome obrigatório'] }),
            { status: 400 },
          ),
        ),
    );
    await expect(request('/users')).rejects.toMatchObject({
      status: 400,
      messages: ['CPF inválido', 'Nome obrigatório'],
    });
  });
  it('trata indisponibilidade e respostas que não são JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(request('/users')).rejects.toBeInstanceOf(ApiError);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response('<html>Erro</html>', { status: 502 })),
    );
    await expect(request('/users')).rejects.toMatchObject({ status: 502 });
  });
  it('envia filtros apenas para a rota da conta, com o dia inteiro de Brasília', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('[]'));
    vi.stubGlobal('fetch', fetcher);
    await api.transactions('conta', '2026-11-01', '2026-11-02');
    const url = new URL(fetcher.mock.calls[0][0], 'http://localhost');
    expect(url.pathname).toBe('/api/v1/pix/transactions/account/conta');
    expect(url.searchParams.get('startDate')).toBe('2026-11-01T03:00:00.000Z');
    expect(url.searchParams.get('endDate')).toBe('2026-11-03T02:59:59.999Z');
  });
  it('preserva a chave de idempotência ao enviar uma transferência', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetcher);
    const body = {
      pixKey: 'destino@email.com',
      amount: 10,
      idempotencyKey: 'mesma-chave',
    };
    await api.transfer('conta', body);
    expect(fetcher.mock.calls[0][0]).toBe(
      '/api/v1/pix/transactions/conta/transfer',
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(body);
  });
});
