import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, Link, useLocation } from 'react-router-dom';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  Landmark,
  KeyRound,
  ArrowLeftRight,
  QrCode,
  Bell,
  FileChartColumn,
  Menu,
  X,
  RefreshCw,
  ArrowUpRight,
  Command,
  LogOut,
} from 'lucide-react';
import Dashboard from '@/pages/dashboard';
import UsersPage from '@/pages/users';
import AccountsPage from '@/pages/accounts';
import KeysPage from '@/pages/keys';
import TransfersPage from '@/pages/transfers';
import ChargesPage from '@/pages/charges';
import NotificationsPage from '@/pages/notifications';
import ReportsPage from '@/pages/reports';
import LoginPage from '@/pages/login';
import { AUTH_EVENT, clearToken, getToken } from '@/services/api';
import { Button } from '@/components/ui/button';
const navigation = [
  { path: '/', title: 'Visão geral', icon: LayoutDashboard },
  { path: '/usuarios', title: 'Usuários', icon: Users },
  { path: '/contas', title: 'Contas bancárias', icon: Landmark },
  { path: '/chaves', title: 'Chaves Pix', icon: KeyRound },
  { path: '/transferencias', title: 'Transferências', icon: ArrowLeftRight },
  { path: '/cobrancas', title: 'Cobranças', icon: QrCode },
  { path: '/notificacoes', title: 'Notificações', icon: Bell },
  { path: '/relatorios', title: 'Relatórios', icon: FileChartColumn },
];
export default function App() {
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const client = useQueryClient();
  const fetching = useIsFetching();
  const [authed, setAuthed] = useState(() => !!getToken());
  useEffect(() => {
    const onLogout = () => setAuthed(false);
    window.addEventListener(AUTH_EVENT, onLogout);
    return () => window.removeEventListener(AUTH_EVENT, onLogout);
  }, []);
  const logout = () => {
    clearToken();
    client.clear();
    setAuthed(false);
  };
  if (!authed) return <LoginPage onLogin={() => setAuthed(true)} />;
  return (
    <div className="app-shell">
      <a href="#content" className="skip-link">
        Ir para o conteúdo
      </a>
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label="Fechar navegação"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? 'is-open' : ''}`}>
        <Link to="/" className="brand">
          <span className="brand-symbol">
            <Command size={25} />
          </span>
          <span>
            pix<span className="brand-dot">.</span>
            <small>PAINEL DE OPERAÇÕES</small>
          </span>
        </Link>
        <button
          className="mobile-close"
          onClick={() => setMenu(false)}
          aria-label="Fechar menu"
        >
          <X />
        </button>
        <p className="nav-heading">WORKSPACE</p>
        <nav aria-label="Navegação principal">
          {navigation.map((n, i) => (
            <NavLink
              key={n.path}
              to={n.path}
              end={n.path === '/'}
              onClick={() => setMenu(false)}
            >
              <n.icon size={19} />
              <span>{n.title}</span>
              {i === 0 && <span className="nav-active-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="live-dot" />
          <strong>Ambiente de simulação</strong>
          <p>Gerencie sua operação Pix com clareza e simplicidade.</p>
          <ArrowUpRight size={20} />
        </div>
        <div className="sidebar-footer">
          <span className="workspace-avatar">PX</span>
          <div>
            <strong>Projeto Pix</strong>
            <small>Administração da plataforma</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <Button
              variant="ghost"
              size="icon"
              className="mobile-toggle"
              onClick={() => setMenu(true)}
              aria-label="Abrir navegação"
            >
              <Menu size={21} />
            </Button>
            <span className="breadcrumb">
              Workspace <span>/</span>{' '}
              <strong>
                {navigation.find((n) => n.path === location.pathname)?.title ||
                  'Página'}
              </strong>
            </span>
          </div>
          <div>
            <span className="environment">
              <span /> Simulação
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void client.invalidateQueries()}
              aria-label="Atualizar dados"
            >
              <RefreshCw size={17} className={fetching ? 'spin' : ''} />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/notificacoes" aria-label="Ver notificações">
                <Bell size={19} />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label="Sair"
            >
              <LogOut size={17} />
            </Button>
            <span className="header-avatar">PX</span>
          </div>
        </header>
        <main id="content" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="/contas" element={<AccountsPage />} />
            <Route path="/chaves" element={<KeysPage />} />
            <Route path="/transferencias" element={<TransfersPage />} />
            <Route path="/cobrancas" element={<ChargesPage />} />
            <Route path="/notificacoes" element={<NotificationsPage />} />
            <Route path="/relatorios" element={<ReportsPage />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>Página não encontrada</h1>
                  <Button asChild>
                    <Link to="/">Voltar ao início</Link>
                  </Button>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
