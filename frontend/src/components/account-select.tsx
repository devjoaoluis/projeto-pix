import { useAccounts, useUsers } from '@/hooks/use-api';
import { shortId } from '@/lib/utils';
export function AccountSelect({
  value,
  onChange,
  all = false,
  id,
  disabled = false,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  all?: boolean;
  id?: string;
  disabled?: boolean;
  error?: string;
}) {
  const accounts = useAccounts();
  const users = useUsers();
  return (
    <div className="account-picker">
      <select
        id={id}
        aria-label="Conta bancária"
        aria-invalid={!!error}
        aria-describedby={error && id ? `${id}-error` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || accounts.isPending}
      >
        <option value="">
          {accounts.isError
            ? 'Falha ao carregar contas'
            : accounts.isPending
              ? 'Carregando contas…'
              : all
                ? 'Todas as contas'
                : 'Selecione uma conta'}
        </option>
        {accounts.data?.map((account) => (
          <option key={account.id} value={account.id}>
            {users.data?.find((u) => u.id === account.userId)?.name ||
              shortId(account.userId)}{' '}
            · {shortId(account.id)}
          </option>
        ))}
      </select>
      {accounts.isError && (
        <p className="field-error" role="alert">
          Não foi possível consultar as contas.{' '}
          <button
            type="button"
            className="text-button"
            onClick={() => void accounts.refetch()}
          >
            Tentar novamente
          </button>
        </p>
      )}
    </div>
  );
}
