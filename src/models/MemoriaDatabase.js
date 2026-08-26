class MemoriaDatabase {
  constructor() {
    this.usuarios = [];
    this.contas = [];
    this.chavesPix = [];
    this.transacoes = [];
    this._nextId = 1;
  }

  // Métodos auxiliares (apenas o getNextId por enquanto)
  getNextId() {
    return this._nextId++;
  }

  // Os métodos de CRUD serão implementados depois
}

// Exporta uma única instância (singleton) para ser compartilhada
module.exports = new MemoriaDatabase();