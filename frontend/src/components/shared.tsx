import { useId, useState, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Inbox,
  LoaderCircle,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { Badge, label } from './ui/badge';
import type { Transaction } from '@/types/api';
import { date, money, shortId } from '@/lib/utils';
export function PageTitle({
  eyebrow = 'PROJETO PIX',
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function QueryState({
  query,
  empty,
  children,
}: {
  query: Pick<UseQueryResult, 'isPending' | 'isError' | 'error' | 'refetch'>;
  empty?: boolean;
  children: ReactNode;
}) {
  if (query.isPending)
    return (
      <div className="skeletons" aria-label="Carregando" role="status">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" />
        ))}
      </div>
    );
  if (query.isError)
    return (
      <div className="empty error" role="alert">
        <AlertCircle />
        <strong>Não foi possível carregar os dados</strong>
        <p>{query.error?.message}</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  if (empty)
    return (
      <div className="empty">
        <Inbox />
        <strong>Nenhum registro encontrado</strong>
        <p>Os registros aparecerão aqui assim que estiverem disponíveis.</p>
      </div>
    );
  return <>{children}</>;
}
export function Field({
  label: text,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{text}</label>
      {children(id)}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="search">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Submit({
  pending,
  children = 'Salvar',
}: {
  pending: boolean;
  children?: ReactNode;
}) {
  return (
    <Button type="submit" disabled={pending}>
      {pending && <LoaderCircle className="spin" size={16} />}{' '}
      {pending ? 'Processando…' : children}
    </Button>
  );
}
export async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Copiado para a área de transferência.');
  } catch {
    toast.error(
      'Não foi possível copiar. Selecione e copie o texto manualmente.',
    );
  }
}
export function CopyButton({ value }: { value: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => void copy(value)}
      aria-label="Copiar"
    >
      <Copy size={15} />
    </Button>
  );
}
export function Confirm({
  title,
  description,
  onConfirm,
  trigger,
  danger = false,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<unknown>;
  trigger: ReactNode;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
        title={title}
        description={description}
      >
        <div className="dialog-actions">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Voltar
          </Button>
          <Button
            variant={danger ? 'destructive' : 'default'}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                setOpen(false);
              } catch {
                /* mutation exposes error */
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Processando…' : 'Confirmar'}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
export function TransactionTable({
  items,
  onCancel,
  onSelect,
}: {
  items: Transaction[];
  onCancel?: (tx: Transaction) => void;
  onSelect?: (tx: Transaction) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Operação</th>
            <th>Data e horário</th>
            <th>Valor</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {[...items]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((tx) => (
              <tr key={tx.id}>
                <td>
                  <div className="cell-main">
                    <span
                      className={`transaction-icon ${tx.type === 'RECEIVE' ? 'incoming' : ''}`}
                    >
                      {tx.type === 'RECEIVE' ? (
                        <ArrowDownLeft size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}
                    </span>
                    <div>
                      {onSelect ? (
                        <button
                          className="text-button"
                          onClick={() => onSelect?.(tx)}
                        >
                          {tx.description || label(tx.type)}
                        </button>
                      ) : (
                        <strong>{tx.description || label(tx.type)}</strong>
                      )}
                      <small title={tx.id}>
                        {label(tx.type)} · {shortId(tx.id)}
                      </small>
                    </div>
                  </div>
                </td>
                <td>{date(tx.scheduledAt || tx.createdAt)}</td>
                <td className="amount">{money(tx.amount)}</td>
                <td>
                  <Badge value={tx.status} />
                </td>
                <td>
                  {onCancel && !['CANCELED', 'FAILED'].includes(tx.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancel(tx)}
                    >
                      Cancelar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
export function Detail({ data }: { data: Record<string, ReactNode> }) {
  return (
    <dl className="details">
      {Object.entries(data).map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
