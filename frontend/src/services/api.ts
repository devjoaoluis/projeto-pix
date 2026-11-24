import type {
  User,
  Account,
  PixKey,
  Transaction,
  Notification,
  Report,
  ReportResult,
  TransferInput,
} from '@/types/api';
const TOKEN_KEY = 'pix_token';
export const AUTH_EVENT = 'pix:logout';
// typeof: testes em Node não têm sessionStorage.
const store = () =>
  typeof sessionStorage === 'undefined' ? null : sessionStorage;
export const getToken = () => store()?.getItem(TOKEN_KEY) ?? null;
export const setToken = (token: string) => store()?.setItem(TOKEN_KEY, token);
export const clearToken = () => store()?.removeItem(TOKEN_KEY);
export class ApiError extends Error {
  constructor(
    public status: number,
    public messages: string[],
  ) {
    super(messages.join(' '));
  }
}
function lookupId(value: string) {
  const id = value.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw new ApiError(400, ['Informe um ID válido no formato UUID.']);
  }
  return id;
}
export async function request<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(
      `${(import.meta.env.VITE_API_BASE_PATH || '/api/v1').replace(/\/$/, '')}${path}`,
      {
        method,
        signal: AbortSignal.timeout(15000),
        headers: {
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
  } catch (error) {
    throw new ApiError(0, [
      error instanceof Error && error.name === 'TimeoutError'
        ? 'A API demorou para responder. Tente novamente em instantes.'
        : 'Não foi possível acessar a API. Confira se o servidor está em execução.',
    ]);
  }
  const payload = await response.text();
  let data: unknown;
  try {
    data = payload ? JSON.parse(payload) : undefined;
  } catch {
    throw new ApiError(response.status, [
      'A API retornou uma resposta inválida. Confira a configuração do servidor.',
    ]);
  }
  // Token expirado ou inválido: volta para a tela de login.
  if (response.status === 401 && getToken()) {
    clearToken();
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? data.message
        : undefined;
    const messages = Array.isArray(message)
      ? message.filter((item): item is string => typeof item === 'string')
      : [];
    throw new ApiError(
      response.status,
      messages.length
        ? messages
        : [
            (typeof message === 'string' && message !== 'Internal server error'
              ? message
              : '') ||
              (response.status >= 500
                ? 'Não foi possível concluir a operação no servidor. Confira a API e a configuração do banco de dados.'
                : `Falha na operação (${response.status}).`),
          ],
    );
  }
  return data as T;
}
export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string }>('/auth/login', 'POST', {
      email,
      password,
    }),
  users: () => request<User[]>('/users'),
  user: (id: string) => request<User>(`/users/${id}`),
  createUser: (body: Omit<User, 'id' | 'createdAt'>) =>
    request<User>('/users', 'POST', body),
  accounts: () => request<Account[]>('/bank-accounts'),
  account: (id: string) => request<Account>(`/bank-accounts/${id}`),
  accountByUser: (id: string) => request<Account>(`/bank-accounts/user/${id}`),
  balance: (id: string) =>
    request<{ bankAccountId: string; balance: string }>(
      `/bank-accounts/${id}/balance`,
    ),
  createAccount: (userId: string) =>
    request<Account>('/bank-accounts', 'POST', { userId }),
  accountAction: (id: string, action: string, body?: unknown) =>
    request<Account>(
      `/bank-accounts/${id}${action ? `/${action}` : ''}`,
      'PATCH',
      body,
    ),
  removeAccount: (id: string) =>
    request<{ message: string }>(`/bank-accounts/${id}`, 'DELETE'),
  keys: (account: string) => request<PixKey[]>(`/pix/keys/account/${account}`),
  createKey: (account: string, key?: string) =>
    request<PixKey>(
      `/pix/keys/account/${account}${key ? '' : '/random'}`,
      'POST',
      key ? { key } : undefined,
    ),
  keyAction: (account: string, id: string, action: string, body?: unknown) =>
    request<PixKey>(
      `/pix/keys/account/${account}/${id}${action ? `/${action}` : ''}`,
      'PATCH',
      body,
    ),
  removeKey: (account: string, id: string) =>
    request(`/pix/keys/account/${account}/${id}`, 'DELETE'),
  transactions: (account = '', startDate = '', endDate = '') => {
    const params = new URLSearchParams();
    if (startDate)
      params.set(
        'startDate',
        new Date(`${startDate}T00:00:00-03:00`).toISOString(),
      );
    if (endDate)
      params.set(
        'endDate',
        new Date(`${endDate}T23:59:59.999-03:00`).toISOString(),
      );
    return request<Transaction[]>(
      `/pix/transactions${account ? `/account/${account}?${params}` : ''}`,
    );
  },
  transfer: (account: string, body: TransferInput) =>
    request<Transaction | { transaction: Transaction }>(
      `/pix/transactions/${account}/transfer`,
      'POST',
      body,
    ),
  schedule: (account: string, body: TransferInput & { scheduledAt: string }) =>
    request<Transaction>(`/pix/transactions/${account}/schedule`, 'POST', body),
  cancel: (id: string) => request(`/pix/transactions/${id}/cancel`, 'PATCH'),
  charge: (body: {
    bankAccountId: string;
    amount: number;
    description?: string;
  }) => request<Transaction>('/pix/generate', 'POST', body),
  chargeStatus: async (id: string) =>
    request<Transaction>(`/pix/${lookupId(id)}/status`),
  simulate: (id: string) =>
    request<Transaction>(`/pix/${id}/simulate-payment`, 'PATCH'),
  notifications: (account = '') =>
    request<Notification[]>(`/notifications${account ? `/${account}` : ''}`),
  reports: (user: string) => request<Report[]>(`/pix/reports/user/${user}`),
  report: async (id: string) => request<Report>(`/pix/reports/${lookupId(id)}`),
  createReport: (
    user: string,
    period?: { startDate: string; endDate: string },
  ) =>
    request<ReportResult>(
      `/pix/reports/user/${user}${period ? '/period' : ''}`,
      'POST',
      period,
    ),
};
