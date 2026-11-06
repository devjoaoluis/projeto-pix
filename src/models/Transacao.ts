import { ContaBancaria } from './ContaBancaria';

export type TipoTransacao = 'PIX_ENVIO' | 'PIX_RECEBIMENTO' | 'ESTORNO';
export type StatusTransacao =
  'PENDENTE' | 'CONCLUIDA' | 'CANCELADA' | 'ESTORNADA';

export class Transacao {
  id: number | null;
  valor: number;
  dataHora: Date;
  tipo: TipoTransacao;
  contaOrigem: ContaBancaria;
  contaDestino: ContaBancaria;
  status: StatusTransacao;
  descricao: string;

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

  estornar(motivo?: string): void {
    if (this.status !== 'CONCLUIDA') {
      throw new Error('Apenas transações concluídas podem ser estornadas');
    }
    this.status = 'ESTORNADA';
    if (motivo) {
      this.descricao = `Estorno: ${motivo}`;
    }
  }
}
