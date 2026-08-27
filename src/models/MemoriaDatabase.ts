import { ChavePix } from './ChavePix';
import { ContaBancaria } from './ContaBancaria';
import { Transacao } from './Transacao';
import { Usuario } from './Usuario';

export class MemoriaDatabase {
  usuarios: any[];
  contas: ContaBancaria[];
  chavesPix: ChavePix[];
  transacoes: any[];
  private _nextId: number;

  constructor() {
    this.usuarios = [];
    this.contas = [];
    this.chavesPix = [];
    this.transacoes = [];
    this._nextId = 1;
  }

  getNextId(): number {
    return this._nextId++;
  }
}

export const db = new MemoriaDatabase();