import { Usuario } from './Usuario';
import { ChavePix } from './ChavePix';

export class ContaBancaria {
  // 1. Declaração dos atributos com seus devidos tipos
  id: number | null;
  numero: string;
  agencia: string;
  saldo: number;
  usuario: Usuario; // Instância de Usuario
  chavesPix: ChavePix[]; // Array de instâncias de ChavePix
  bloqueada: boolean;
  limiteDiario: number;

  // 2. Construtor tipado
  constructor(numero: string, agencia: string, usuario: Usuario) {
    this.id = null;
    this.numero = numero;
    this.agencia = agencia;
    this.saldo = 0;
    this.usuario = usuario;
    this.chavesPix = [];
    this.bloqueada = false;
    this.limiteDiario = 10000.00;
  }

  // Métodos serão adicionados depois
}