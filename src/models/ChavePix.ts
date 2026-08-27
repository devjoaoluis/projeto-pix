import { ContaBancaria } from './ContaBancaria';

export type TipoChavePix = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';

export class ChavePix {
  id: number | null;
  tipo: TipoChavePix;
  valor: string;
  conta: ContaBancaria;
  ativa: boolean;
  suspensa: boolean;
  dataAssociacao: Date;

  constructor(tipo: TipoChavePix, valor: string, conta: ContaBancaria) {
    this.id = null;
    this.tipo = tipo;
    this.valor = valor;
    this.conta = conta;
    this.ativa = true;
    this.suspensa = false;
    this.dataAssociacao = new Date();
  }
}