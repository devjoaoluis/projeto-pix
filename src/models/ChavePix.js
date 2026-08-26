class ChavePix {
  // Atributos:
  // id, tipo ('CPF'|'CNPJ'|'EMAIL'|'TELEFONE'|'ALEATORIA'), valor, conta (referência), ativa, suspensa, dataAssociacao

  constructor(tipo, valor, conta) {
    this.id = null;
    this.tipo = tipo;
    this.valor = valor;
    this.conta = conta; // instância de ContaBancaria
    this.ativa = true;
    this.suspensa = false;
    this.dataAssociacao = new Date();
  }

  // Métodos estáticos e de instância serão adicionados depois
}

module.exports = ChavePix;