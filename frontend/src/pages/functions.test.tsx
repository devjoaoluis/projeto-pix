// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { api } from '@/services/api';
import UsersPage from './users';
import AccountsPage from './accounts';
import KeysPage from './keys';
import TransfersPage from './transfers';
import ChargesPage from './charges';
import ReportsPage from './reports';
import NotificationsPage from './notifications';
import Dashboard from './dashboard';
import App from '@/App';

vi.mock('@/services/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/api')>();
  return {
    ...original,
    api: Object.fromEntries(
      Object.keys(original.api).map((key) => [key, vi.fn()]),
    ),
  };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Pessoa Teste',
  cpf: '52998224725',
  email: 'teste@example.com',
  phone: '11999999999',
  createdAt: '2026-11-24T12:00:00Z',
};
const account = {
  id: '22222222-2222-4222-8222-222222222222',
  userId: user.id,
  balance: '100.00',
  status: 'ACTIVE' as const,
  blockedReason: null,
  blockedAt: null,
  dailyLimit: null,
  createdAt: user.createdAt,
  updatedAt: user.createdAt,
};
const key = {
  id: '33333333-3333-4333-8333-333333333333',
  bankAccountId: account.id,
  key: 'chave@example.com',
  type: 'EMAIL' as const,
  status: 'ACTIVE' as const,
  suspendedReason: null,
  suspendedAt: null,
  createdAt: user.createdAt,
};
const transaction = {
  id: '44444444-4444-4444-8444-444444444444',
  bankAccountId: null,
  senderAccountId: account.id,
  receiverAccountId: 'outro',
  amount: '10.50',
  description: 'Pagamento de teste',
  type: 'TRANSFER',
  status: 'COMPLETED',
  pixCode: null,
  createdAt: user.createdAt,
  scheduledAt: null,
};
const report = {
  id: '55555555-5555-4555-8555-555555555555',
  userId: user.id,
  type: 'USER' as const,
  startDate: null,
  endDate: null,
  totalTransactions: 1,
  totalSent: '10.50',
  totalReceived: '0.00',
  createdAt: user.createdAt,
};
let client: QueryClient;
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.users).mockResolvedValue([user]);
  vi.mocked(api.accounts).mockResolvedValue([account]);
  vi.mocked(api.transactions).mockResolvedValue([transaction]);
  vi.mocked(api.notifications).mockResolvedValue([]);
  vi.mocked(api.keys).mockResolvedValue([key]);
  vi.mocked(api.reports).mockResolvedValue([report]);
  vi.mocked(api.account).mockResolvedValue(account);
  vi.mocked(api.balance).mockResolvedValue({
    bankAccountId: account.id,
    balance: account.balance,
  });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});
afterEach(() => {
  cleanup();
  client.clear();
});
function mount(page: ReactElement) {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}
async function menu(label: string) {
  fireEvent.keyDown(
    await screen.findByRole('button', { name: 'Abrir ações' }),
    { key: 'Enter' },
  );
  fireEvent.click(await screen.findByRole('menuitem', { name: label }));
}
function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: true }), {
    target: { value },
  });
}
async function selectAccount() {
  const select = await screen.findByRole('combobox', {
    name: 'Conta bancária',
  });
  await waitFor(() =>
    expect(within(select).getAllByRole('option').length).toBeGreaterThan(1),
  );
  fireEvent.change(select, { target: { value: account.id } });
}

describe('funcionalidades disponíveis nas telas', () => {
  it.each([
    ['/', 'Tudo sob controle.'],
    ['/usuarios', 'Usuários'],
    ['/contas', 'Contas bancárias'],
    ['/chaves', 'Chaves Pix'],
    ['/transferencias', 'Transferências'],
    ['/cobrancas', 'Cobranças Pix'],
    ['/notificacoes', 'Notificações'],
    ['/relatorios', 'Relatórios'],
  ])(
    'rota %s abre a tela e mantém as oito áreas na navegação',
    async (path, title) => {
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={[path]}>
            <App />
          </MemoryRouter>
        </QueryClientProvider>,
      );
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
      expect(
        within(
          screen.getByRole('navigation', { name: 'Navegação principal' }),
        ).getAllByRole('link'),
      ).toHaveLength(8);
    },
  );
  it('visão geral mostra o saldo retornado e os atalhos', async () => {
    mount(<Dashboard />);
    await screen.findByText(/100,00/);
    expect(
      screen.getByRole('link', { name: 'Enviar Pix' }).getAttribute('href'),
    ).toBe('/transferencias');
    expect(api.accounts).toHaveBeenCalled();
  });
  it('usuários cadastra dados sem máscaras', async () => {
    vi.mocked(api.createUser).mockResolvedValue(user);
    mount(<UsersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Novo usuário' }));
    fill('Nome completo', user.name);
    fill('CPF', '529.982.247-25');
    fill('E-mail', user.email);
    fill('Telefone', '(11) 99999-9999');
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar usuário' }));
    await waitFor(() =>
      expect(api.createUser).toHaveBeenCalledWith(
        {
          name: user.name,
          cpf: user.cpf,
          email: user.email,
          phone: user.phone,
        },
        expect.anything(),
      ),
    );
  });
  it('contas cria uma conta vinculada ao titular', async () => {
    vi.mocked(api.createAccount).mockResolvedValue(account);
    mount(<AccountsPage />);
    await screen.findByText(user.name);
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    fireEvent.change(screen.getByLabelText('Titular'), {
      target: { value: user.id },
    });
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Criar conta',
      }),
    );
    await waitFor(() =>
      expect(api.createAccount).toHaveBeenCalledWith(
        user.id,
        expect.anything(),
      ),
    );
  });
  it.each([
    [
      'Depósito manual',
      'balance',
      'Valor do depósito (R$)',
      '12,50',
      { amount: 12.5 },
    ],
    [
      'Definir limite diário',
      'daily-limit',
      'Limite diário (R$)',
      '0',
      { dailyLimit: 0 },
    ],
  ] as const)(
    'contas confirma %s com número correto',
    async (label, action, field, value, body) => {
      vi.mocked(api.accountAction).mockResolvedValue(account);
      mount(<AccountsPage />);
      await menu(label);
      fill(field, value);
      expect(api.accountAction).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
      await waitFor(() =>
        expect(api.accountAction).toHaveBeenCalledWith(
          account.id,
          action,
          body,
        ),
      );
    },
  );
  it.each([
    ['Bloquear conta', 'block'],
    ['Ativar conta', 'activate'],
  ] as const)('contas pede confirmação para %s', async (label, action) => {
    vi.mocked(api.accountAction).mockResolvedValue(account);
    mount(<AccountsPage />);
    await menu(label);
    expect(api.accountAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(api.accountAction).toHaveBeenCalledWith(
        account.id,
        action,
        undefined,
      ),
    );
  });
  it('contas confirma remoção', async () => {
    vi.mocked(api.removeAccount).mockResolvedValue({ message: 'Removida' });
    mount(<AccountsPage />);
    await menu('Remover conta');
    expect(api.removeAccount).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(api.removeAccount).toHaveBeenCalledWith(account.id),
    );
  });
  it.each([false, true])(
    'chaves cadastra chave (aleatória=%s)',
    async (random) => {
      vi.mocked(api.createKey).mockResolvedValue(key);
      mount(<KeysPage />);
      await selectAccount();
      fireEvent.click(screen.getByRole('button', { name: 'Adicionar chave' }));
      if (!random) fill('CPF, CNPJ, e-mail ou telefone internacional', key.key);
      fireEvent.click(
        screen.getByRole('button', {
          name: random ? 'Chave aleatória' : 'Cadastrar',
        }),
      );
      await waitFor(() =>
        expect(api.createKey).toHaveBeenCalledWith(
          account.id,
          random ? undefined : key.key,
        ),
      );
    },
  );
  it.each([
    ['Suspender', 'suspend'],
    ['Gerar novo valor aleatório', 'random'],
  ] as const)('chaves confirma %s', async (label, action) => {
    vi.mocked(api.keyAction).mockResolvedValue(key);
    mount(<KeysPage />);
    await selectAccount();
    await menu(label);
    expect(api.keyAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(api.keyAction).toHaveBeenCalledWith(
        account.id,
        key.id,
        action,
        action === 'suspend' ? { reason: undefined } : undefined,
      ),
    );
  });
  it('chaves confirma desbloqueio de chave suspensa', async () => {
    vi.mocked(api.keys).mockResolvedValue([{ ...key, status: 'SUSPENDED' }]);
    vi.mocked(api.keyAction).mockResolvedValue(key);
    mount(<KeysPage />);
    await selectAccount();
    await menu('Desbloquear');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(api.keyAction).toHaveBeenCalledWith(
        account.id,
        key.id,
        'unblock',
        undefined,
      ),
    );
  });
  it('chaves edita o valor', async () => {
    vi.mocked(api.keyAction).mockResolvedValue(key);
    mount(<KeysPage />);
    await selectAccount();
    await menu('Editar chave / conta');
    fill('Valor da chave', 'nova@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(api.keyAction).toHaveBeenCalledWith(account.id, key.id, '', {
        key: 'nova@example.com',
        newBankAccountId: undefined,
      }),
    );
  });
  it('chaves confirma remoção', async () => {
    vi.mocked(api.removeKey).mockResolvedValue({});
    mount(<KeysPage />);
    await selectAccount();
    await menu('Remover');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(api.removeKey).toHaveBeenCalledWith(account.id, key.id),
    );
  });
  it.each([false, true])(
    'transferências só envia após confirmação (agendada=%s)',
    async (scheduled) => {
      vi.mocked(api.transfer).mockResolvedValue({ transaction });
      vi.mocked(api.schedule).mockResolvedValue({
        ...transaction,
        status: 'SCHEDULED',
      });
      mount(<TransfersPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Enviar Pix' }));
      await selectAccount();
      fill('Chave Pix de destino', key.key);
      fill('Valor (R$)', '10,50');
      if (scheduled) fill('Agendar para (opcional)', '2099-12-31T12:00');
      fireEvent.click(
        screen.getByRole('button', { name: 'Revisar transferência' }),
      );
      await screen.findByRole('dialog', { name: 'Confirmar transferência' });
      expect(api.transfer).not.toHaveBeenCalled();
      expect(api.schedule).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pix' }));
      await waitFor(() =>
        expect(scheduled ? api.schedule : api.transfer).toHaveBeenCalledWith(
          account.id,
          expect.objectContaining({
            pixKey: key.key,
            amount: 10.5,
            idempotencyKey: expect.any(String),
          }),
        ),
      );
    },
  );
  it('transferências confirma cancelamento', async () => {
    vi.mocked(api.cancel).mockResolvedValue({});
    mount(<TransfersPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(api.cancel).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar cancelamento' }),
    );
    await waitFor(() =>
      expect(api.cancel).toHaveBeenCalledWith(transaction.id),
    );
  });
  it('cobranças gera cobrança com conta e valor corretos', async () => {
    const charge = {
      ...transaction,
      type: 'PIX_CHARGE',
      status: 'PENDING',
      bankAccountId: account.id,
    };
    vi.mocked(api.charge).mockResolvedValue(charge);
    vi.mocked(api.chargeStatus).mockResolvedValue(charge);
    mount(<ChargesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Nova cobrança' }));
    await selectAccount();
    fill('Valor (R$)', '25,50');
    fireEvent.click(screen.getByRole('button', { name: 'Gerar cobrança' }));
    await waitFor(() =>
      expect(api.charge).toHaveBeenCalledWith({
        bankAccountId: account.id,
        amount: 25.5,
        description: '',
      }),
    );
  });
  it.each(['USER', 'PERIOD'])('relatórios gera tipo %s', async (mode) => {
    vi.mocked(api.createReport).mockResolvedValue({
      report,
      transactions: [transaction],
    });
    mount(<ReportsPage />);
    const select = screen.getByRole('combobox', {
      name: 'Usuário do relatório',
    });
    await waitFor(() =>
      expect(within(select).getAllByRole('option').length).toBe(2),
    );
    fireEvent.change(select, { target: { value: user.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar relatório' }));
    if (mode === 'PERIOD') {
      fireEvent.change(screen.getByLabelText('Tipo de relatório'), {
        target: { value: 'PERIOD' },
      });
      fill('Data inicial', '2026-11-01');
      fill('Data final', '2026-11-24');
    }
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Gerar relatório',
      }),
    );
    await waitFor(() =>
      expect(api.createReport).toHaveBeenCalledWith(
        user.id,
        mode === 'PERIOD'
          ? { startDate: '2026-11-01', endDate: '2026-11-24' }
          : undefined,
      ),
    );
  });
  it('notificações filtra pela conta selecionada', async () => {
    mount(<NotificationsPage />);
    await selectAccount();
    await waitFor(() =>
      expect(api.notifications).toHaveBeenCalledWith(account.id),
    );
  });
});
