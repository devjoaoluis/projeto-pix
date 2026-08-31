# 🏦 Projeto Pix API

API RESTful para gerenciamento de usuários, contas bancárias, chaves Pix e transferências, desenvolvida com **NestJS** e TypeScript. Simula operações do sistema Pix com persistência em memória.

---

## 📦 Tecnologias

- **[NestJS](https://nestjs.com/)** – Framework progressivo para Node.js.
- **TypeScript** – Tipagem estática e JavaScript moderno.
- **Class‑Validator** e **Class‑Transformer** – Validação e transformação de DTOs.
- **Banco de dados em memória** – `MemoriaDatabase` (mock) para prototipagem rápida.

---

## 🚀 Funcionalidades

### 👤 Usuários
- ✅ Cadastrar usuário (nome, CPF, email, telefone)
- ✅ Buscar usuário por ID
- ✅ Atualizar dados do usuário (nome, email, telefone)
- ✅ Remover usuário (remove também contas e chaves Pix vinculadas)

### 🏦 Contas Bancárias
- ✅ Criar conta bancária para um usuário (número, agência)
- ✅ Buscar conta por ID
- ✅ Atualizar dados da conta (limite diário, bloqueio, etc.)
- ✅ Remover conta bancária (remove também as chaves Pix associadas)

### 🔑 Chaves Pix
- ✅ Associar chave Pix a uma conta (tipos: CPF, CNPJ, Email, Telefone, Aleatória)
- ✅ Gerar chave Pix aleatória automaticamente
- ✅ Validar chave Pix (verifica se existe e está ativa)

### 💸 Transferências (Pix)
- ✅ Transferir valor entre contas usando chave Pix (envio)
- ✅ Receber valor em conta usando chave Pix (recebimento)

