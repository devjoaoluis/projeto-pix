class Transacao {
  // Atributos:
  // id, valor, dataHora, tipo ('PIX_ENVIO'|'PIX_RECEBIMENTO'|'ESTORNO'), 
  // contaOrigem, contaDestino, status ('PENDENTE'|'CONCLUIDA'|'CANCELADA'), descricao

  constructor(valor, tipo, contaOrigem, contaDestino, descricao = '') {
    this.id = null;
    this.valor = valor;
    this.dataHora = new Date();
    this.tipo = tipo; // ex: 'PIX_ENVIO'
    this.contaOrigem = contaOrigem; // instância de ContaBancaria
    this.contaDestino = contaDestino; // instância de ContaBancaria
    this.status = 'PENDENTE';
    this.descricao = descricao;
  }

  // Métodos serão adicionados depois
}

module.exports = Transacao;