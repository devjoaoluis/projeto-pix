import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { api } from '@/services/api';
import { date, shortId, money } from '@/lib/utils';
import { AccountSelect } from '@/components/account-select';
import { Card } from '@/components/ui/card';
import { PageTitle, QueryState } from '@/components/shared';
export default function NotificationsPage() {
  const [account, setAccount] = useState('');
  const query = useQuery({
    queryKey: ['notifications', account],
    queryFn: () => api.notifications(account),
  });
  return (
    <>
      <PageTitle
        title="Notificações"
        description="Acompanhe os eventos das suas contas em tempo real."
      />
      <Card>
        <div className="toolbar">
          <AccountSelect value={account} onChange={setAccount} all />
          <span className="muted">{query.data?.length || 0} notificações</span>
        </div>
        <QueryState query={query} empty={!query.data?.length}>
          <div className="events">
            {[...(query.data || [])].reverse().map((n) => (
              <article key={n.id}>
                <span
                  className={`transaction-icon ${n.type === 'RECEIVE' ? 'incoming' : ''}`}
                >
                  {n.type === 'RECEIVE' ? (
                    <ArrowDownLeft size={21} />
                  ) : n.type === 'TRANSFER' ? (
                    <ArrowUpRight size={21} />
                  ) : (
                    <Bell size={21} />
                  )}
                </span>
                <div>
                  <h3>{n.message}</h3>
                  <p>
                    {n.description || 'Movimentação Pix'} · Conta{' '}
                    <span title={n.accountId}>{shortId(n.accountId)}</span>
                  </p>
                  <small title={n.transactionId}>
                    Transação {shortId(n.transactionId)} · {date(n.notifiedAt)}
                  </small>
                </div>
                <strong>{money(n.amount)}</strong>
              </article>
            ))}
          </div>
        </QueryState>
      </Card>
      <p className="footnote">
        As notificações são mantidas em memória pela API e podem desaparecer
        após o reinício do servidor.
      </p>
    </>
  );
}
