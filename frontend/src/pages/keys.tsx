import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Shuffle } from 'lucide-react';
import { api } from '@/services/api';
import { useAction } from '@/hooks/use-api';
import type { PixKey } from '@/types/api';
import { AccountSelect } from '@/components/account-select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, label } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { ActionMenu } from '@/components/ui/dropdown-menu';
import {
  CopyButton,
  Field,
  PageTitle,
  QueryState,
  Submit,
} from '@/components/shared';
export default function KeysPage() {
  const [account, setAccount] = useState('');
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [target, setTarget] = useState('');
  const [op, setOp] = useState<{
    key: PixKey;
    action: string;
    title: string;
  }>();
  const query = useQuery({
    queryKey: ['keys', account],
    queryFn: () => api.keys(account),
    enabled: !!account,
  });
  const create = useAction(
    (random: boolean) => api.createKey(account, random ? undefined : value),
    () => {
      setOpen(false);
      setValue('');
    },
  );
  const action = useAction(
    async () => {
      if (!op) return;
      if (op.action === 'delete') return api.removeKey(account, op.key.id);
      return api.keyAction(
        account,
        op.key.id,
        op.action,
        op.action === ''
          ? { key: value || undefined, newBankAccountId: target || undefined }
          : op.action === 'suspend'
            ? { reason: value || undefined }
            : undefined,
      );
    },
    () => setOp(undefined),
  );
  function choose(key: PixKey, action: string, title: string) {
    setOp({ key, action, title });
    setValue(action === '' ? key.key : '');
    setTarget('');
  }
  return (
    <>
      <PageTitle
        title="Chaves Pix"
        description="Suas conexões para enviar e receber."
        action={
          <Button
            disabled={!account}
            onClick={() => {
              setValue('');
              setOpen(true);
            }}
          >
            <Plus size={17} /> Adicionar chave
          </Button>
        }
      />
      <Card>
        <div className="toolbar">
          <AccountSelect value={account} onChange={setAccount} />
          {account && (
            <span className="muted">{query.data?.length || 0} chaves</span>
          )}
        </div>
        {account ? (
          <QueryState query={query} empty={!query.data?.length}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Chave</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Motivo da suspensão</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {query.data?.map((k) => (
                    <tr key={k.id}>
                      <td>
                        <span className="key-value">
                          {k.key}
                          <CopyButton value={k.key} />
                        </span>
                      </td>
                      <td>{label(k.type)}</td>
                      <td>
                        <Badge value={k.status} />
                      </td>
                      <td>{k.suspendedReason || '—'}</td>
                      <td>
                        <ActionMenu
                          items={[
                            {
                              label: 'Editar chave / conta',
                              action: () => choose(k, '', 'Editar chave'),
                            },
                            {
                              label: 'Gerar novo valor aleatório',
                              action: () =>
                                choose(
                                  k,
                                  'random',
                                  'Substituir por chave aleatória',
                                ),
                            },
                            ...(k.status === 'ACTIVE'
                              ? [
                                  {
                                    label: 'Suspender',
                                    action: () =>
                                      choose(k, 'suspend', 'Suspender chave'),
                                  },
                                ]
                              : [
                                  {
                                    label: 'Desbloquear',
                                    action: () =>
                                      choose(k, 'unblock', 'Desbloquear chave'),
                                  },
                                ]),
                            {
                              label: 'Remover',
                              danger: true,
                              action: () =>
                                choose(k, 'delete', 'Remover chave'),
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
        ) : (
          <div className="empty">
            <strong>Selecione uma conta</strong>
            <p>Consulte e gerencie as chaves vinculadas à conta.</p>
          </div>
        )}
      </Card>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Adicionar chave Pix"
        description="O tipo é identificado automaticamente pela API."
      >
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(false);
          }}
        >
          <Field label="CPF, CNPJ, e-mail ou telefone internacional">
            {(id) => (
              <input
                id={id}
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Ex.: nome@email.com ou +5511999999999"
              />
            )}
          </Field>
          {create.isError && (
            <p className="field-error" role="alert">
              {create.error.message}
            </p>
          )}
          <div className="dialog-actions">
            <Button
              variant="outline"
              disabled={create.isPending}
              onClick={() => create.mutate(true)}
            >
              <Shuffle size={16} /> Chave aleatória
            </Button>
            <Submit pending={create.isPending}>Cadastrar</Submit>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={!!op}
        onOpenChange={(v) => {
          if (!action.isPending && !v) setOp(undefined);
        }}
        title={op?.title || ''}
        description={`Confirme a operação para a chave ${op?.key.key || ''}.`}
      >
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            action.mutate();
          }}
        >
          {op?.action === '' && (
            <>
              <Field label="Valor da chave">
                {(id) => (
                  <input
                    id={id}
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                )}
              </Field>
              <Field label="Transferir para outra conta (opcional)">
                {(id) => (
                  <AccountSelect id={id} value={target} onChange={setTarget} />
                )}
              </Field>
            </>
          )}
          {op?.action === 'suspend' && (
            <Field label="Motivo (opcional)">
              {(id) => (
                <input
                  id={id}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              )}
            </Field>
          )}
          {action.isError && (
            <p className="field-error" role="alert">
              {action.error.message}
            </p>
          )}
          <div className="dialog-actions">
            <Submit pending={action.isPending}>Confirmar</Submit>
          </div>
        </form>
      </Dialog>
    </>
  );
}
