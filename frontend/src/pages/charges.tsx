import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { api } from '@/services/api';
import { useAction, useLookup } from '@/hooks/use-api';
import { chargeSchema, amountNumber } from '@/lib/validation';
import type { Transaction } from '@/types/api';
import { date, money } from '@/lib/utils';
import { AccountSelect } from '@/components/account-select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import {
  Confirm,
  CopyButton,
  Detail,
  Field,
  PageTitle,
  QueryState,
  Submit,
} from '@/components/shared';
export default function ChargesPage() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Transaction>();
  const [id, setId] = useState('');
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.transactions(),
  });
  const items = query.data?.filter((t) => t.type === 'PIX_CHARGE') || [];
  const status = useQuery({
    queryKey: ['charge', selected?.id],
    queryFn: () => api.chargeStatus(selected!.id),
    enabled: !!selected,
    refetchInterval: (query) =>
      (query.state.data?.status || selected?.status) === 'PENDING'
        ? 10000
        : false,
  });
  const current = status.data || selected;
  const form = useForm({
    resolver: zodResolver(chargeSchema),
    defaultValues: { bankAccountId: '', amount: '', description: '' },
  });
  const create = useAction(
    async (v: {
      bankAccountId: string;
      amount: number;
      description: string;
    }) => {
      return api.charge(v);
    },
    (charge) => {
      setOpen(false);
      setSelected(charge);
      form.reset();
    },
  );
  const lookup = useLookup(async (id: string) => {
    const charge = await api.chargeStatus(id.trim());
    if (charge.type !== 'PIX_CHARGE')
      throw new Error('O ID informado não corresponde a uma cobrança.');
    setSelected(charge);
  });
  const simulate = useAction(async () => {
    if (!current) return;
    const updated = await api.simulate(current.id);
    setSelected(updated);
    client.setQueryData(['charge', updated.id], updated);
  });
  return (
    <>
      <PageTitle
        title="Cobranças Pix"
        description="Gere cobranças e acompanhe seus pagamentos."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={17} /> Nova cobrança
          </Button>
        }
      />
      <Card>
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            lookup.mutate(id);
          }}
        >
          <input
            aria-label="ID da cobrança"
            placeholder="Consultar cobrança pelo ID"
            required
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <Button variant="outline" type="submit" disabled={lookup.isPending}>
            Consultar status
          </Button>
        </form>
        <QueryState query={query} empty={!items.length}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Criada em</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id}>
                    <td>
                      {t.description || 'Cobrança Pix'}
                      <small>{t.id}</small>
                    </td>
                    <td>{date(t.createdAt)}</td>
                    <td className="amount">{money(t.amount)}</td>
                    <td>
                      <Badge value={t.status} />
                    </td>
                    <td>
                      <Button variant="ghost" onClick={() => setSelected(t)}>
                        Ver cobrança
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </Card>
      <Dialog open={open} onOpenChange={setOpen} title="Nova cobrança Pix">
        <form
          className="form"
          onSubmit={form.handleSubmit((v) =>
            create.mutate({ ...v, amount: amountNumber(v.amount) }),
          )}
        >
          <Field
            label="Conta recebedora"
            error={form.formState.errors.bankAccountId?.message}
          >
            {(id) => (
              <AccountSelect
                id={id}
                error={form.formState.errors.bankAccountId?.message}
                value={form.watch('bankAccountId')}
                onChange={(v) =>
                  form.setValue('bankAccountId', v, { shouldValidate: true })
                }
              />
            )}
          </Field>
          {(['amount', 'description'] as const).map((name) => (
            <Field
              key={name}
              label={name === 'amount' ? 'Valor (R$)' : 'Descrição (opcional)'}
              error={form.formState.errors[name]?.message}
            >
              {(id) => (
                <input
                  id={id}
                  inputMode={name === 'amount' ? 'decimal' : undefined}
                  aria-describedby={`${id}-error`}
                  aria-invalid={!!form.formState.errors[name]}
                  {...form.register(name)}
                />
              )}
            </Field>
          ))}
          {create.isError && (
            <p role="alert" className="field-error">
              {create.error.message}
            </p>
          )}
          <Submit pending={create.isPending}>Gerar cobrança</Submit>
        </form>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={() => setSelected(undefined)}
        title="Detalhes da cobrança"
        description="Cobrança de simulação gerada pela API do Projeto Pix."
      >
        {current && (
          <>
            <Detail
              data={{
                ID: current.id,
                Valor: money(current.amount),
                Status: <Badge value={current.status} />,
                Descrição: current.description,
              }}
            />
            <QueryState query={status}>
              <span />
            </QueryState>
            {current.pixCode && (
              <div className="code-box">
                <div>
                  <strong>Código retornado pela API</strong>
                  <CopyButton value={current.pixCode} />
                </div>
                <textarea
                  aria-label="Código Pix"
                  readOnly
                  value={current.pixCode}
                />
                <small>
                  O backend gera um código simulado. Use no ambiente de
                  demonstração.
                </small>
              </div>
            )}
            <div className="dialog-actions">
              <Button variant="outline" onClick={() => void status.refetch()}>
                Atualizar status
              </Button>
              {current.status === 'PENDING' && (
                <Confirm
                  title="Simular pagamento"
                  description="A API marcará esta cobrança como paga. Essa simulação não credita saldo na conta."
                  onConfirm={() => simulate.mutateAsync()}
                  trigger={<Button>Simular pagamento</Button>}
                />
              )}
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
