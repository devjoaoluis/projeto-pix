import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  Wallet,
  Users,
  Landmark,
  Activity,
  Send,
  KeyRound,
  QrCode,
} from 'lucide-react';
import { api } from '@/services/api';
import { useAccounts, useUsers } from '@/hooks/use-api';
import { money, date } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageTitle, QueryState, TransactionTable } from '@/components/shared';
export default function Dashboard() {
  const accounts = useAccounts();
  const users = useUsers();
  const transactions = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.transactions(),
  });
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications(),
  });
  const total = accounts.data?.reduce((sum, a) => sum + Number(a.balance), 0);
  return (
    <>
      <PageTitle
        eyebrow="SEU CENTRO DE OPERAÇÕES"
        title="Tudo sob controle."
        description="Acompanhe suas contas e movimentações em um só lugar."
        action={
          <Button asChild>
            <Link to="/transferencias">
              <Send size={16} /> Enviar Pix
            </Link>
          </Button>
        }
      />
      <div className="stat-grid">
        <Card className="balance-card">
          <span className="stat-label">
            <Wallet size={18} /> Saldo consolidado
          </span>
          <QueryState query={accounts}>
            <h2>{money(total || 0)}</h2>
            <p>{accounts.data?.length || 0} contas no total</p>
          </QueryState>
          <span className="balance-decoration">↗</span>
        </Card>
        {[
          {
            name: 'Contas ativas',
            value: accounts.data?.filter((a) => a.status === 'ACTIVE').length,
            query: accounts,
            icon: Landmark,
          },
          {
            name: 'Usuários cadastrados',
            value: users.data?.length,
            query: users,
            icon: Users,
          },
          {
            name: 'Transações registradas',
            value: transactions.data?.length,
            query: transactions,
            icon: Activity,
          },
        ].map((stat) => (
          <Card className="stat-card" key={stat.name}>
            <span className="stat-label">
              <stat.icon size={18} />
              {stat.name}
            </span>
            <QueryState query={stat.query}>
              <h2>{stat.value ?? 0}</h2>
              <p className="muted">Dados atuais da plataforma</p>
            </QueryState>
          </Card>
        ))}
      </div>
      <div className="quick-actions">
        {[
          {
            title: 'Transferir via Pix',
            text: 'Envie para uma chave Pix',
            href: '/transferencias',
            icon: Send,
          },
          {
            title: 'Criar uma cobrança',
            text: 'Gere um código de pagamento',
            href: '/cobrancas',
            icon: QrCode,
          },
          {
            title: 'Gerenciar chaves',
            text: 'Organize suas chaves Pix',
            href: '/chaves',
            icon: KeyRound,
          },
        ].map((item) => (
          <Link to={item.href} key={item.href}>
            <span className="quick-icon">
              <item.icon size={21} />
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.text}</small>
            </span>
            <ArrowUpRight size={18} />
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <Card>
          <div className="section-heading">
            <div>
              <h2>Últimas movimentações</h2>
              <p className="muted">Atividade recente das suas contas</p>
            </div>
            <Link className="link" to="/transferencias">
              Ver todas <ArrowRight size={15} />
            </Link>
          </div>
          <QueryState query={transactions} empty={!transactions.data?.length}>
            <TransactionTable
              items={[...(transactions.data || [])]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 6)}
            />
          </QueryState>
        </Card>
        <Card>
          <div className="section-heading">
            <div>
              <h2>Notificações</h2>
              <p className="muted">Fique por dentro</p>
            </div>
            <span className="count">{notifications.data?.length ?? '—'}</span>
          </div>
          <QueryState query={notifications} empty={!notifications.data?.length}>
            <div className="notification-list">
              {[...(notifications.data || [])]
                .reverse()
                .slice(0, 4)
                .map((n) => (
                  <div key={n.id}>
                    <span className="notification-dot" />
                    <div>
                      <strong>{n.message}</strong>
                      <small>{date(n.notifiedAt)}</small>
                    </div>
                  </div>
                ))}
            </div>
          </QueryState>
          <Link className="notification-footer link" to="/notificacoes">
            Todas as notificações <ArrowRight size={15} />
          </Link>
        </Card>
      </div>
      <p className="footnote">
        Projeto Pix · Ambiente de simulação de operações financeiras
      </p>
    </>
  );
}
