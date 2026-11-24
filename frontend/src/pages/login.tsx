import { useState } from 'react';
import { toast } from 'sonner';
import { api, setToken } from '@/services/api';
import { Button } from '@/components/ui/button';

// A API exige JWT em todas as rotas: este painel entra com e-mail e senha.
export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { accessToken } = await api.login(email.trim(), password);
      setToken(accessToken);
      onLogin();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha no login.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="empty">
      <form onSubmit={submit} style={{ display: 'grid', gap: 12, width: 320 }}>
        <h1>Entrar no painel Pix</h1>
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" disabled={busy}>
          {busy ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </main>
  );
}
