import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAction, useLookup, useAccounts, useUsers } from '@/hooks/use-api';
import { api } from '@/services/api';
import type { Account } from '@/types/api';
import { money, shortId, date } from '@/lib/utils';
import { amountSchema, amountNumber } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ActionMenu } from '@/components/ui/dropdown-menu';
import {
  Detail,
  Field,
  PageTitle,
  QueryState,
  SearchInput,
  Submit,
} from '@/components/shared';
type Operation = { account: Account; action: string; title: string };
export default function AccountsPage() {
  const query = useAccounts();
  const users = useUsers();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState('');
  const [op, setOp] = useState<Operation>();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Account>();
  const create = useAction(api.createAccount, () => setOpen(false));
  const lookup = useLookup(async (id: string) => {
    const [account, balance] = await Promise.all([
      api.account(id),
      api.balance(id),
    ]);
    setSelected({ ...account, balance: balance.balance });
  });
  const action = useAction(
    async () => {
      if (!op) return;
      if (op.action === 'delete') return api.removeAccount(op.account.id);
      return api.accountAction(
        op.account.id,
        op.action,
        op.action === 'balance'
          ? { amount: amountNumber(value) }
          : op.action === 'daily-limit'
            ? { dailyLimit: amountNumber(value) }
            : undefined,
      );
    },
    () => setOp(undefined),
  );
  const items =
    query.data?.filter((a) =>
      `${a.id} ${a.userId} ${users.data?.find((u) => u.id === a.userId)?.name || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) || [];
  function choose(account: Account, action: string, title: string) {
    setOp({ account, action, title });
    setValue('');
    setError('');
  }
  return (
    <>
      <PageTitle
        title="Contas bancárias"
        description="Saldos, limites e controle das suas contas."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={17} /> Criar conta
          </Button>
        }
      />
      <Card>
        <div className="toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por titular ou ID"
          />
          <span className="muted">{items.length} contas</span>
        </div>
        <QueryState query={query} empty={!items.length}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Titular / Conta</th>
                  <th>Saldo</th>
                  <th>Limite diário</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => lookup.mutate(a.id)}
                      >
                        {users.data?.find((u) => u.id === a.userId)?.name ||
                          shortId(a.userId)}
                      </button>
                      <small title={a.id}>{shortId(a.id)}</small>
                    </td>
                    <td className="amount">{money(a.balance)}</td>
                    <td>
                      {a.dailyLimit === null
                        ? 'Sem limite'
                        : money(a.dailyLimit)}
                    </td>
                    <td>
                      <Badge value={a.status} />
                    </td>
                    <td>
                      <ActionMenu
                        items={[
                          {
                            label: 'Consultar detalhes e saldo',
                            action: () => lookup.mutate(a.id),
                          },
                          {
                            label: 'Depósito manual',
                            action: () =>
                              choose(a, 'balance', 'Confirmar depósito'),
                          },
                          {
                            label: 'Definir limite diário',
                            action: () =>
                              choose(a, 'daily-limit', 'Alterar limite diário'),
                          },
                          {
                            label: 'Bloquear conta',
                            action: () => choose(a, 'block', 'Bloquear conta'),
                          },
                          {
                            label: 'Ativar conta',
                            action: () => choose(a, 'activate', 'Ativar conta'),
                          },
                          {
                            label: 'Remover conta',
                            danger: true,
                            action: () => choose(a, 'delete', 'Remover conta'),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </Card>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Criar conta bancária"
        description="Cada usuário pode ter uma conta bancária."
      >
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(user);
          }}
        >
          <Field label="Titular">
            {(id) => (
              <select
                id={id}
                required
                value={user}
                onChange={(e) => setUser(e.target.value)}
              >
                <option value="">Selecione o usuário</option>
                {users.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <QueryState query={users} empty={!users.data?.length}>
            <span />
          </QueryState>
          {create.isError && (
            <p role="alert" className="field-error">
              {create.error.message}
            </p>
          )}
          <Submit pending={create.isPending}>Criar conta</Submit>
        </form>
      </Dialog>
      <Dialog
        open={!!op}
        onOpenChange={(v) => {
          if (!action.isPending && !v) setOp(undefined);
        }}
        title={op?.title || ''}
        description={`Confirme a alteração da conta ${shortId(op?.account.id)}. A operação será enviada à API.`}
      >
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (['balance', 'daily-limit'].includes(op?.action || '')) {
              const valid =
                (op?.action === 'daily-limit' &&
                  /^0([.,]0{1,2})?$/.test(value)) ||
                amountSchema.safeParse(value).success;
              if (!valid) {
                setError(
                  'Informe um valor válido com até duas casas decimais.',
                );
                return;
              }
            }
            action.mutate();
          }}
        >
          {['balance', 'daily-limit'].includes(op?.action || '') && (
            <Field
              label={
                op?.action === 'balance'
                  ? 'Valor do depósito (R$)'
                  : 'Limite diário (R$)'
              }
              error={error}
            >
              {(id) => (
                <input
                  id={id}
                  value={value}
                  inputMode="decimal"
                  onChange={(e) => setValue(e.target.value)}
                  required
                  aria-invalid={!!error}
                  aria-describedby={`${id}-error`}
                />
              )}
            </Field>
          )}
          {action.isError && (
            <p role="alert" className="field-error">
              {action.error.message}
            </p>
          )}
          <div className="dialog-actions">
            <Submit pending={action.isPending}>Confirmar</Submit>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={() => setSelected(undefined)}
        title="Detalhes da conta"
      >
        {selected && (
          <Detail
            data={{
              ID: selected.id,
              'ID do titular': selected.userId,
              Saldo: money(selected.balance),
              Status: <Badge value={selected.status} />,
              'Limite diário':
                selected.dailyLimit === null
                  ? 'Sem limite'
                  : money(selected.dailyLimit),
              'Motivo do bloqueio': selected.blockedReason,
              Cadastro: date(selected.createdAt),
            }}
          />
        )}
      </Dialog>
    </>
  );
}
