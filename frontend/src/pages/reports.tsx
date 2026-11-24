import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FilePlus2 } from 'lucide-react';
import { api } from '@/services/api';
import { useAction, useLookup, useUsers } from '@/hooks/use-api';
import type { Report } from '@/types/api';
import { date, money } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Detail,
  Field,
  PageTitle,
  QueryState,
  Submit,
} from '@/components/shared';
export default function ReportsPage() {
  const users = useUsers();
  const [user, setUser] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [mode, setMode] = useState('USER');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Report>();
  const [error, setError] = useState('');
  const [id, setId] = useState('');
  const query = useQuery({
    queryKey: ['reports', user],
    queryFn: () => api.reports(user),
    enabled: !!user,
  });
  const create = useAction(
    async () => {
      const result = await api.createReport(
        user,
        mode === 'PERIOD' ? { startDate: start, endDate: end } : undefined,
      );
      return result.report;
    },
    (report) => {
      setOpen(false);
      setSelected(report);
    },
  );
  const lookup = useLookup(async (id: string) =>
    setSelected(await api.report(id.trim())),
  );
  return (
    <>
      <PageTitle
        title="Relatórios"
        description="Consulte os resultados e o histórico da sua operação."
        action={
          <Button
            disabled={!user}
            onClick={() => {
              setError('');
              setOpen(true);
            }}
          >
            <FilePlus2 size={17} /> Gerar relatório
          </Button>
        }
      />
      <Card>
        <div className="toolbar">
          <select
            aria-label="Usuário do relatório"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          >
            <option value="">Selecione um usuário</option>
            {users.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              lookup.mutate(id);
            }}
          >
            <input
              aria-label="ID do relatório"
              placeholder="Consultar pelo ID"
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
            <Button variant="outline" type="submit" disabled={lookup.isPending}>
              Consultar
            </Button>
          </form>
        </div>
        <QueryState query={users}>
          <span />
        </QueryState>
        {user ? (
          <QueryState query={query} empty={!query.data?.length}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Gerado em</th>
                    <th>Transações</th>
                    <th>Total enviado</th>
                    <th>Total recebido</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {query.data?.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Badge value={r.type} />
                      </td>
                      <td>{date(r.createdAt)}</td>
                      <td>{r.totalTransactions}</td>
                      <td>{money(r.totalSent)}</td>
                      <td>{money(r.totalReceived)}</td>
                      <td>
                        <Button
                          variant="ghost"
                          onClick={() => lookup.mutate(r.id)}
                        >
                          Ver relatório
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </QueryState>
        ) : (
          <div className="empty">
            <strong>Escolha um usuário</strong>
            <p>Consulte relatórios gerais ou gere um relatório por período.</p>
          </div>
        )}
      </Card>
      <Dialog open={open} onOpenChange={setOpen} title="Gerar relatório">
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === 'PERIOD' && (!start || !end || start > end)) {
              setError('Informe um período válido.');
              return;
            }
            setError('');
            create.mutate();
          }}
        >
          <Field label="Tipo de relatório">
            {(id) => (
              <select
                id={id}
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="USER">Geral do usuário</option>
                <option value="PERIOD">Por período</option>
              </select>
            )}
          </Field>
          {mode === 'PERIOD' && (
            <div className="form-row">
              <Field label="Data inicial">
                {(id) => (
                  <input
                    type="date"
                    id={id}
                    required
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                )}
              </Field>
              <Field label="Data final">
                {(id) => (
                  <input
                    type="date"
                    id={id}
                    required
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                )}
              </Field>
            </div>
          )}
          {(error || create.isError) && (
            <p role="alert" className="field-error">
              {error || create.error?.message}
            </p>
          )}
          <Submit pending={create.isPending}>Gerar relatório</Submit>
        </form>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={() => setSelected(undefined)}
        title="Detalhes do relatório"
        description="Totais calculados pela API. Os critérios de inclusão são definidos pelo backend."
      >
        {selected && (
          <Detail
            data={{
              ID: selected.id,
              Tipo: <Badge value={selected.type} />,
              Transações: selected.totalTransactions,
              'Total enviado': money(selected.totalSent),
              'Total recebido': money(selected.totalReceived),
              Início: date(selected.startDate),
              Fim: date(selected.endDate),
              'Gerado em': date(selected.createdAt),
            }}
          />
        )}
      </Dialog>
    </>
  );
}
