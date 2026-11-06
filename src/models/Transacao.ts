import { ContaBancaria } from './ContaBancaria';

export type TipoTransacao = 'PIX_ENVIO' | 'PIX_RECEBIMENTO' | 'ESTORNO';
export type StatusTransacao =
  'PENDENTE' | 'AGENDADA' | 'CONCLUIDA' | 'CANCELADA';

export class Transacao {
  id: number | null;
  valor: number;
  dataHora: Date;
  tipo: TipoTransacao;
  contaOrigem: ContaBancaria;
  contaDestino: ContaBancaria;
  status: StatusTransacao;
  descricao: string;
  agendadaPara?: Date;

  constructor(
    valor: number,
    tipo: TipoTransacao,
    contaOrigem: ContaBancaria,
    contaDestino: ContaBancaria,
    descricao: string = '',
  ) {
    this.id = null;
    this.valor = valor;
    this.dataHora = new Date();
    this.tipo = tipo;
    this.contaOrigem = contaOrigem;
    this.contaDestino = contaDestino;
    this.status = 'PENDENTE';
    this.descricao = descricao;
  }

  agendar(dataAgendamento: Date): void {
    if (dataAgendamento <= new Date()) {
      throw new Error('A data de agendamento deve ser futura');
    }
    this.agendadaPara = dataAgendamento;
    this.status = 'AGENDADA';
  }
}
