const labels: Record<string, string> = {
  ACTIVE: 'Ativa',
  BLOCKED: 'Bloqueada',
  CLOSED: 'Encerrada',
  SUSPENDED: 'Suspensa',
  PENDING: 'Pendente',
  PAID: 'Paga',
  COMPLETED: 'Concluída',
  CANCELED: 'Cancelada',
  SCHEDULED: 'Agendada',
  FAILED: 'Falhou',
  TRANSFER: 'Transferência',
  RECEIVE: 'Recebimento',
  PIX_CHARGE: 'Cobrança',
  USER: 'Geral',
  PERIOD: 'Por período',
  RANDOM: 'Aleatória',
  PHONE: 'Telefone',
  EMAIL: 'E-mail',
};
export const label = (value: string) => labels[value] || value;
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge badge-${value.toLowerCase()}`}>
      <span />
      {label(value)}
    </span>
  );
}
