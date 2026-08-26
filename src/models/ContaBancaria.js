class ContaBancaria {
  // Atributos:
  // id, numero, agencia, saldo, usuario (referência), chavesPix (array), bloqueada, limiteDiario

  constructor(numero, agencia, usuario) {
    this.id = null;
    this.numero = numero;
    this.agencia = agencia;
    this.saldo = 0;
    this.usuario = usuario; // instância de Usuario
    this.chavesPix = [];
    this.bloqueada = false;
    this.limiteDiario = 10000.00;
  }

  // Métodos serão adicionados depois
}

module.exports = ContaBancaria;