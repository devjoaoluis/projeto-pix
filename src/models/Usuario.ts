import { ContaBancaria } from './ContaBancaria';

export class Usuario {
  id: number | null;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  dataCadastro: Date;
  contas: ContaBancaria[];
  notificacaoSmsAtiva: boolean;
  notificacaoEmailAtiva: boolean;

  constructor(nome: string, cpf: string, email: string, telefone: string) {
    this.id = null;
    this.nome = nome;
    this.cpf = cpf;
    this.email = email;
    this.telefone = telefone;
    this.dataCadastro = new Date();
    this.contas = [];
    this.notificacaoSmsAtiva = false;
    this.notificacaoEmailAtiva = false;
  }

  configurarNotificacoes(sms: boolean, email: boolean): void {
    this.notificacaoSmsAtiva = sms;
    this.notificacaoEmailAtiva = email;
  }
}
