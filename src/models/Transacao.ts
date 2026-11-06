import { ContaBancaria } from './ContaBancaria';

export type TipoTransacao = 'PIX_ENVIO' | 'PIX_RECEBIMENTO' | 'ESTORNO';
export type StatusTransacao = 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA';

export class Transacao {
  id: number | null;
  valor: number;
  dataHora: Date;
  tipo: TipoTransacao;
  contaOrigem: ContaBancaria;
  contaDestino: ContaBancaria;
  status: StatusTransacao;
  descricao: string;
  latitude?: number;
  longitude?: number;
  localizacao?: string;

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

  registrarLocalizacao(
    latitude: number,
    longitude: number,
    localizacao?: string,
  ): void {
    if (latitude < -90 || latitude > 90) {
      throw new Error('Latitude inválida');
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude inválida');
    }
    this.latitude = latitude;
    this.longitude = longitude;
    this.localizacao = localizacao;
  }
}
