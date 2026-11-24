import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { api } from '@/services/api';
import { useAction } from '@/hooks/use-api';
import { transferSchema, amountNumber } from '@/lib/validation';
import { date, money } from '@/lib/utils';
import type { Transaction } from '@/types/api';
import { buildTransferDraft, type TransferDraft } from '@/lib/transfer-draft';
import { AccountSelect } from '@/components/account-select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import {
  Detail,
  Field,
  PageTitle,
  QueryState,
  Submit,
  TransactionTable,
} from '@/components/shared';
type Draft = TransferDraft;
export default function TransfersPage() {
  const [account, setAccount] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [tab, setTab] = useState('all');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>();
  const previousDraft = useRef<Draft | undefined>(undefined);
  const [cancel, setCancel] = useState<Transaction>();
  const [selected, setSelected] = useState<Transaction>();
  const validDates = !start || !end || start <= end;
  const query = useQuery({
    queryKey: ['transactions', account, start, end],
    queryFn: () => api.transactions(account, start, end),
    enabled: validDates,
  });
  const form = useForm({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      account: '',
      pixKey: '',
      amount: '',
      description: '',
      scheduledAt: '',
    },
  });
  const send = useAction(
    async (v: Draft) => {
      const { account, scheduledAt, ...body } = v;
      const result = scheduledAt
        ? await api.schedule(account, { ...body, scheduledAt })
        : await api.transfer(account, body);
      return 'transaction' in result ? result.transaction : result;
    },
    (transaction) => {
      setDraft(undefined);
      setOpen(false);
      setSelected(transaction);
      previousDraft.current = undefined;
      form.reset();
    },
  );
  const cancelAction = useAction(
    (id: string) => api.cancel(id),
    () => setCancel(undefined),
  );
  const items = (query.data || []).filter(
    (t) => tab !== 'scheduled' || t.status === 'SCHEDULED',
  );
  return (
    <>
      <PageTitle
        title="Transferências"
        description="Envie Pix e acompanhe cada movimentação."
        action={
          <Button onClick={() => setOpen(true)}>
            <Send size={16} /> Enviar Pix
          </Button>
        }
      />
      <Card>
        <div className="toolbar filters">
          <AccountSelect
            value={account}
            onChange={(v) => {
              setAccount(v);
              setStart('');
              setEnd('');
            }}
            all
          />
          <Field label="De">
            {(id) => (
              <input
                id={id}
                type="date"
                disabled={!account}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            )}
          </Field>
          <Field label="Até">
            {(id) => (
              <input
                id={id}
                type="date"
                disabled={!account}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            )}
          </Field>
        </div>
        {!account && (
          <p className="filter-hint">
            Selecione uma conta para filtrar por período.
          </p>
        )}
        {!validDates && (
          <p className="field-error" role="alert">
            A data final deve ser igual ou posterior à inicial.
          </p>
        )}
        <div className="tabs" role="group" aria-label="Filtrar transações">
          {[
            ['all', 'Todas as movimentações'],
            ['scheduled', 'Agendadas'],
          ].map(([value, text]) => (
            <button
              aria-pressed={tab === value}
              key={value}
              onClick={() => setTab(value)}
            >
              {text}
            </button>
          ))}
        </div>
        {validDates && (
          <QueryState query={query} empty={!items.length}>
            <TransactionTable
              items={items}
              onCancel={setCancel}
              onSelect={setSelected}
            />
          </QueryState>
        )}
      </Card>
      <Dialog
        open={open && !draft}
        onOpenChange={setOpen}
        title="Enviar Pix"
        description="Revise os dados antes de confirmar a operação."
      >
        <form
          className="form"
          onSubmit={form.handleSubmit((v) => {
            if (v.scheduledAt && new Date(v.scheduledAt) <= new Date()) {
              form.setError('scheduledAt', {
                message: 'Escolha uma data futura.',
              });
              return;
            }
            const nextDraft = buildTransferDraft(
              {
                ...v,
                amount: amountNumber(v.amount),
                scheduledAt: v.scheduledAt
                  ? new Date(v.scheduledAt).toISOString()
                  : '',
              },
              previousDraft.current,
            );
            previousDraft.current = nextDraft;
            setDraft(nextDraft);
          })}
        >
          <Field
            label="Conta de origem"
            error={form.formState.errors.account?.message}
          >
            {(id) => (
              <AccountSelect
                id={id}
                error={form.formState.errors.account?.message}
                value={form.watch('account')}
                onChange={(v) =>
                  form.setValue('account', v, { shouldValidate: true })
                }
              />
            )}
          </Field>
          {(['pixKey', 'amount', 'description', 'scheduledAt'] as const).map(
            (name) => (
              <Field
                key={name}
                label={
                  {
                    pixKey: 'Chave Pix de destino',
                    amount: 'Valor (R$)',
                    description: 'Descrição (opcional)',
                    scheduledAt: 'Agendar para (opcional)',
                  }[name]
                }
                error={form.formState.errors[name]?.message}
              >
                {(id) => (
                  <input
                    id={id}
                    type={name === 'scheduledAt' ? 'datetime-local' : 'text'}
                    inputMode={name === 'amount' ? 'decimal' : undefined}
                    aria-invalid={!!form.formState.errors[name]}
                    aria-describedby={`${id}-error`}
                    {...form.register(name)}
                  />
                )}
              </Field>
            ),
          )}
          <Submit pending={false}>Revisar transferência</Submit>
        </form>
      </Dialog>
      <Dialog
        open={!!draft}
        onOpenChange={(v) => {
          if (!send.isPending && !v) setDraft(undefined);
        }}
        title="Confirmar transferência"
        description="Confira o destino, a conta de origem e o valor."
      >
        {draft && (
          <>
            <Detail
              data={{
                'Conta de origem': draft.account,
                'Chave de destino': draft.pixKey,
                Valor: money(draft.amount),
                Descrição: draft.description || '—',
                Execução: draft.scheduledAt
                  ? date(draft.scheduledAt)
                  : 'Imediata',
              }}
            />
            {send.isError && (
              <p role="alert" className="field-error">
                {send.error.message}
              </p>
            )}
            <div className="dialog-actions">
              <Button
                variant="outline"
                disabled={send.isPending}
                onClick={() => setDraft(undefined)}
              >
                Editar dados
              </Button>
              <Button
                disabled={send.isPending}
                onClick={() => send.mutate(draft)}
              >
                {send.isPending ? 'Enviando…' : 'Confirmar Pix'}
              </Button>
            </div>
          </>
        )}
      </Dialog>
      <Dialog
        open={!!cancel}
        onOpenChange={(v) => {
          if (!cancelAction.isPending && !v) setCancel(undefined);
        }}
        title="Cancelar transação"
        description="O cancelamento pode provocar estorno. A API verificará se a operação é permitida."
      >
        {cancel && (
          <>
            <Detail data={{ ID: cancel.id, Valor: money(cancel.amount) }} />
            {cancelAction.isError && (
              <p className="field-error" role="alert">
                {cancelAction.error.message}
              </p>
            )}
            <div className="dialog-actions">
              <Button
                variant="destructive"
                disabled={cancelAction.isPending}
                onClick={() => cancelAction.mutate(cancel.id)}
              >
                Confirmar cancelamento
              </Button>
            </div>
          </>
        )}
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={() => setSelected(undefined)}
        title="Detalhes da transação"
        description="Dados retornados pela API."
      >
        {selected && (
          <Detail
            data={{
              ID: selected.id,
              Valor: money(selected.amount),
              Status: <Badge value={selected.status} />,
              Origem: selected.senderAccountId,
              Destino: selected.receiverAccountId,
              Descrição: selected.description,
              Data: date(selected.createdAt),
              Agendamento: date(selected.scheduledAt),
            }}
          />
        )}
      </Dialog>
    </>
  );
}
