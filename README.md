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
- ✅ Consulta de histórico de logins e atividades do usuário (registro e consulta com filtros por tipo e período)
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
- ✅ Alterar chave Pix associada (atualização do valor da chave ou da conta bancária vinculada)
- ✅ Desbloquear chave Pix suspensa (reativação de chave com status SUSPENDED / BLOCKED)
- ✅ Suspender chave Pix (bloqueio temporário da chave)
- ✅ Integrar chaves Pix com contatos do usuário (agenda de contatos com resolução e sincronização automática de chaves Pix)
- ✅ Remover chave Pix associada à conta

### 💸 Transferências (Pix)
- ✅ Transferir valor entre contas usando chave Pix (envio)
- ✅ Receber valor em conta usando chave Pix (recebimento)

### 🔔 Notificações
- ✅ Habilitar e configurar notificações por SMS e/ou Email por conta
- ✅ Listar notificações de transações enviadas e recebidas

---

## ⚙️ Configuração

- `TZ=America/Sao_Paulo` no `.env`: o limite diário de transferências zera à meia-noite do fuso do processo Node; sem essa variável, em servidor UTC ele zeraria às 21h de Brasília.

---

## 🐳 Rodando com Docker (banco + API)

```bash
cp .env.example .env
docker compose up --build
```

Sobe o Postgres, cria as tabelas, insere os dados de exemplo e inicia a API em `http://localhost:3000`.

> Se você já tinha o volume antigo `projeto-pix_banco_pix_data` (de uma versão anterior do compose), rode `docker compose down -v` uma vez para recriá-lo limpo. Isso apaga os dados locais.

## 🏗️ Infraestrutura como código (Terraform)

Em `infra/`, o Terraform (provider `docker`) cria rede, volume, banco, seed e API. As imagens são construídas antes, fora do Terraform:

```bash
docker build --target runtime -t pix-api:latest .
docker build --target build   -t pix-seed:latest .

cd infra
terraform init
export TF_VAR_db_password=<senha>           # a senha nunca vai em arquivo
terraform workspace new dev                 # um estado por ambiente (dev, hom, prd)
terraform plan  -var-file=envs/dev.tfvars   # mostra o que vai mudar
terraform apply -var-file=envs/dev.tfvars
terraform destroy -var-file=envs/dev.tfvars
```

Cada ambiente usa portas próprias (`envs/*.tfvars`), então dev, hom e prd podem rodar juntos.

---

## 🔄 CI/CD (GitHub Actions)

A pipeline é executada automaticamente em pushes e pull requests nas branches `main` e `develop` (além de permitir execução manual via `workflow_dispatch`):

- **Testes Unitários e Build**: instala dependências (`npm ci`), roda a suíte de testes unitários (`npm test`) e compila o projeto (`npm run build`).
- **Testes de Integração**: inicializa o ambiente completo via `docker compose up -d --build`, aguarda o endpoint de health check (`GET http://localhost:3000/`) responder e executa os 18 testes de integração do fluxo antifraude (`npm run test:integration`), realizando a limpeza dos containers ao final (`docker compose down -v`).
- **Imagem Docker**: valida a construção das imagens multi-stage (`runtime` e `build`) a partir do [Dockerfile](file:///c:/Users/proje/Documents/code/projeto-pix/Dockerfile).
- **Terraform**: executa `terraform fmt -check` e `terraform validate` na pasta `infra/` (*terraform plan* fica reservado para quando houver nuvem e backend remoto configurados).

