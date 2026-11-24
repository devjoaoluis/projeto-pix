# 🏦 Projeto Pix API

API RESTful para gerenciamento de usuários, contas bancárias, chaves Pix, transferências (instantâneas e agendadas), detecção de fraude, notificações e relatórios, desenvolvida com **NestJS**, **TypeScript**, **PostgreSQL** e **Drizzle ORM**.

---

## 📦 Tecnologias

- **[NestJS 11](https://nestjs.com/)** & **TypeScript** – Framework backend modular para Node.js com tipagem estática.
- **[PostgreSQL 15](https://www.postgresql.org/)** & **[Drizzle ORM](https://orm.drizzle.team/)** – Persistência relacional, schema tipado e migrations/push (`drizzle-kit`).
- **Class-Validator**, **Class-Transformer** e **brazilian-class-validator** – Validação e transformação de DTOs (incluindo CPF/CNPJ e chaves Pix).
- **@nestjs/schedule** – Agendamento de tarefas (cron) para execução automática de Pix agendados.
- **Docker** & **Docker Compose** – Build multi-stage e orquestração completa (PostgreSQL + seed + API).
- **Terraform** – Infraestrutura como código (provider `docker`, com suporte a múltiplos ambientes).
- **Jest** & **Supertest** – Testes unitários e de integração.
- **GitHub Actions** – Pipeline automatizada de CI/CD.

---

## 🚀 Funcionalidades

### 👤 Usuários
- ✅ Cadastrar usuário (nome, CPF validado, email, telefone)
- ✅ Listar usuários e buscar por ID
- ✅ Atualizar dados do usuário (nome, email, telefone)
- ✅ Registrar e consultar histórico de logins e atividades (com filtros por tipo e período)
- ✅ Remover usuário com exclusão em cascata (contas, chaves Pix e registros vinculados)

### 🏦 Contas Bancárias
- ✅ Criar, listar, atualizar e remover contas bancárias
- ✅ Buscar conta por ID ou por usuário
- ✅ Consultar e atualizar saldo
- ✅ Definir limite diário de transferências
- ✅ Bloquear, ativar e bloquear conta por suspeita de fraude

### 🔑 Chaves Pix & Contatos
- ✅ Associar chave Pix a uma conta (`CPF`, `CNPJ`, `EMAIL`, `PHONE`, `RANDOM`)
- ✅ Gerar chave Pix aleatória automaticamente
- ✅ Validar chave Pix (existência e status ativo)
- ✅ Alterar chave Pix associada ou trocar conta vinculada
- ✅ Suspender/bloquear e desbloquear/reativar chaves Pix
- ✅ Integrar agenda de contatos do usuário com resolução e sincronização automática de chaves Pix
- ✅ Remover chave Pix associada à conta

### 💸 Transferências (Pix)
- ✅ Transferir e receber valores via chave Pix em transação atômica no banco (proteção contra corrida de saldo)
- ✅ Validação de limite diário de transferências
- ✅ Agendar transferências Pix com execução automática via cron (`@nestjs/schedule`)
- ✅ Cancelar transferências agendadas e estornar transações concluídas (inclusive transações indevidas)
- ✅ Registrar localização geográfica (`latitude` / `longitude`) nas transações Pix
- ✅ Consultar histórico de transações com filtros por data/período
- ✅ Gerar cobrança Pix, consultar status, simular pagamento e processar webhook

### 🛡️ Detecção de Fraude
- ✅ Motor de análise de risco baseado em pontuação (`score`) com 9 regras (volume anormal em janela curta, valor elevado, horário atípico, fracionamento/*structuring*, chave Pix recém-criada, destinatário bloqueado, movimentação rápida entrada/saída, múltiplos destinatários distintos e autotransferência entre contas)
- ✅ Bloqueio automático da conta remetente ao atingir o limiar configurado (`score >= 70`)

### 🔔 Notificações
- ✅ Habilitar e configurar preferências de notificação por SMS e/ou Email por conta
- ✅ Listar notificações gerais e por conta bancária

### 📊 Relatórios
- ✅ Gerar relatórios de transações por usuário e por período
- ✅ Consultar relatórios por usuário ou por ID do relatório

---

## 🗺️ Principais Endpoints

| Módulo | Base Route | Operações principais |
| :--- | :--- | :--- |
| **Health** | `/` | `GET /` |
| **Usuários** | `/users` | `POST`, `GET`, `GET /:id`, `PATCH/PUT /:id`, `DELETE /:id`, `POST /:id/login`, `POST/GET /:id/activities`, `GET /:id/login-history` |
| **Contas** | `/bank-accounts` | `POST`, `GET`, `GET /:id`, `GET /user/:userId`, `GET/PATCH /:id/balance`, `PATCH /:id/daily-limit`, `PATCH /:id/block`, `PATCH /:id/block-fraud`, `PATCH /:id/activate`, `PATCH /:id`, `DELETE /:id` |
| **Chaves Pix** | `/pix/keys` (ou `/pix/keys/account`) | `POST /:bankAccountId`, `POST /:bankAccountId/random`, `GET /:bankAccountId`, `PATCH/PUT /:bankAccountId/:id`, `PATCH /:bankAccountId/:id/suspend`, `PATCH /:bankAccountId/:id/unblock`, `DELETE /:bankAccountId/:id` |
| **Contatos Pix** | `/pix/contacts` | `POST/GET /user/:userId`, `POST /user/:userId/sync`, `GET/PATCH/DELETE /user/:userId/:contactId` |
| **Pix (Cobrança)** | `/pix` | `POST /generate`, `GET /:id/status`, `PATCH /:id/simulate-payment` |
| **Transações Pix** | `/pix/transactions` | `GET`, `POST /:senderAccountId/transfer`, `POST /:senderAccountId/schedule`, `GET /account/:bankAccountId`, `GET /account/:bankAccountId/history`, `GET /account/:bankAccountId/scheduled`, `PATCH /:id/cancel`, `POST /webhook` |
| **Relatórios** | `/pix/reports` | `POST /user/:userId`, `POST /user/:userId/period`, `GET /user/:userId`, `GET /:reportId` |
| **Notificações** | `/notifications` | `GET`, `GET /:accountId`, `GET/PATCH /:accountId/preferences`, `POST /:accountId/enable-sms`, `POST /:accountId/enable-email` |

---

## ⚙️ Configuração

Copie o arquivo de exemplo antes de rodar o projeto:

```bash
cp .env.example .env
```

Principais variáveis no `.env`:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `API_PORT`: usadas pelo Docker Compose.
- `DB_URL`: string de conexão PostgreSQL quando a API roda fora do Docker (ex.: `postgresql://root:rootpassword@localhost:5433/banco_pix`).
- `TZ=America/Sao_Paulo`: o limite diário de transferências zera à meia-noite do fuso do processo Node; sem essa variável, em servidor UTC ele zeraria às 21h de Brasília.

---

## 🐳 Rodando com Docker (banco + API)

```bash
cp .env.example .env
docker compose up --build
```

Sobe o Postgres, cria as tabelas (`db:push`), insere os dados de exemplo (`seed`) e inicia a API em `http://localhost:3000`.

> Se você já tinha o volume antigo `projeto-pix_banco_pix_data` (de uma versão anterior do compose), rode `docker compose down -v` uma vez para recriá-lo limpo. Isso apaga os dados locais.

---

## 💻 Rodando localmente (sem Docker para a API)

Requisitos: **Node.js 20+** e uma instância do **PostgreSQL** acessível (você pode subir apenas o banco com `docker compose up -d postgres`).

```bash
npm install
cp .env.example .env
# Descomente e ajuste DB_URL no .env apontando para o seu PostgreSQL

npm run db:push
npm run seed
npm run start:dev
```

A API ficará disponível em `http://localhost:3000`.

---

## 🧪 Testes

```bash
# Testes unitários
npm test

# Testes unitários com cobertura
npm run test:cov

# Testes de integração (fluxo antifraude — requer a API rodando)
npm run test:integration
# Opcionalmente defina API_URL (padrão: http://localhost:3000)

# Testes e2e
npm run test:e2e
```

---

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

Cada ambiente usa portas próprias (`envs/*.tfvars`), então `dev`, `hom` e `prd` podem rodar juntos.

---

## 🔄 CI/CD (GitHub Actions)

A pipeline definida em [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) é executada automaticamente em pushes e pull requests nas branches `main` e `develop` (além de permitir execução manual via `workflow_dispatch`):

- **Testes Unitários e Build**: instala dependências (`npm ci`), roda a suíte de testes unitários (`npm test`) e compila o projeto (`npm run build`).
- **Testes de Integração**: inicializa o ambiente completo via `docker compose up -d --build`, aguarda o endpoint de health check (`GET http://localhost:3000/`) responder e executa os testes de integração do fluxo antifraude (`npm run test:integration`), realizando a limpeza dos containers ao final (`docker compose down -v`).
- **Imagem Docker**: valida a construção das imagens multi-stage (`runtime` e `build`) a partir do [`Dockerfile`](./Dockerfile).
- **Terraform**: executa `terraform fmt -check` e `terraform validate` na pasta `infra/` (*terraform plan* fica reservado para quando houver nuvem e backend remoto configurados).

---

## 📁 Estrutura do Projeto

```text
projeto-pix/
├── .github/workflows/ci.yml   # Pipeline CI/CD (GitHub Actions)
├── infra/                     # Infraestrutura como código (Terraform + envs)
├── src/
│   ├── bank-account/          # Contas bancárias, saldo, limite diário e bloqueios
│   ├── db/                    # Conexão Drizzle ORM, schema e seed
│   ├── modules/usuarios/      # Usuários e histórico de logins/atividades
│   ├── notification/          # Preferências (SMS/Email) e notificações
│   └── pix/
│       ├── contacts/          # Agenda de contatos com chaves Pix
│       ├── fraud/             # Motor de detecção de fraude e testes de integração
│       ├── pix-key/           # Gerenciamento de chaves Pix
│       ├── pix-transaction/   # Transferências, agendamento, estorno e localização
│       └── reports/           # Relatórios por usuário e período
├── Dockerfile                 # Build multi-stage (build + runtime)
├── docker-compose.yml         # PostgreSQL + Seed + API
└── .env.example               # Modelo de variáveis de ambiente
```
