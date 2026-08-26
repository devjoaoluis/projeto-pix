class Usuario {
  // Atributos:
  // id, nome, cpf, email, telefone, dataCadastro, contas (array de ContaBancaria)

  constructor(nome, cpf, email, telefone) {
    this.id = null;
    this.nome = nome;
    this.cpf = cpf;
    this.email = email;
    this.telefone = telefone;
    this.dataCadastro = new Date();
    this.contas = [];
  }

  // Métodos públicos serão adicionados depois
}

module.exports = Usuario;