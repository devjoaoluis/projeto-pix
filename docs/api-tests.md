# Guia de Testes da API (Projeto Pix)

Este documento contém todos os endpoints disponíveis na API, com o corpo das requisições (payloads) necessários para testá-los no Postman, Insomnia ou via cURL. A base URL assumida é `http://localhost:3000`.

---

## 1. Usuários (`/users`)

### Criar um Usuário
- **Método**: `POST`
- **Rota**: `/users`
- **Body** (JSON):
```json
{
  "name": "João Silva",
  "cpf": "12345678901",
  "email": "joao@email.com",
  "phone": "11999999999"
}
```

### Listar Todos os Usuários
- **Método**: `GET`
- **Rota**: `/users`

### Buscar Usuário por ID
- **Método**: `GET`
- **Rota**: `/users/:id`

---

## 2. Contas Bancárias (`/bank-accounts`)

### Criar uma Conta Bancária
- **Método**: `POST`
- **Rota**: `/bank-accounts`
- **Body** (JSON):
```json
{
  "userId": "uuid-do-usuario"
}
```

### Listar Todas as Contas
- **Método**: `GET`
- **Rota**: `/bank-accounts`

### Buscar Conta por ID
- **Método**: `GET`
- **Rota**: `/bank-accounts/:id`

### Buscar Conta pelo ID do Usuário
- **Método**: `GET`
- **Rota**: `/bank-accounts/user/:userId`

### Consultar Saldo da Conta
- **Método**: `GET`
- **Rota**: `/bank-accounts/:id/balance`

### Atualizar Saldo (Depósito Manual)
- **Método**: `PATCH`
- **Rota**: `/bank-accounts/:id/balance`
- **Body** (JSON):
```json
{
  "amount": 500.00
}
```

### Atualizar Status da Conta
- **Método**: `PATCH`
- **Rota**: `/bank-accounts/:id`
- **Body** (JSON):
```json
{
  "status": "INACTIVE"
}
```

### Bloquear Conta
- **Método**: `PATCH`
- **Rota**: `/bank-accounts/:id/block`

### Ativar Conta
- **Método**: `PATCH`
- **Rota**: `/bank-accounts/:id/activate`

### Deletar Conta
- **Método**: `DELETE`
- **Rota**: `/bank-accounts/:id`

---

## 3. Chaves Pix (`/pix/keys`)

### Criar Chave Pix Manual (CPF, Email, Telefone)
- **Método**: `POST`
- **Rota**: `/pix/keys/account/:bankAccountId`
- **Body** (JSON):
```json
{
  "key": "joao@email.com"
}
```

### Listar Chaves Pix da Conta
- **Método**: `GET`
- **Rota**: `/pix/keys/account/:bankAccountId`

### Gerar Chave Pix Aleatória
- **Método**: `POST`
- **Rota**: `/pix/keys/account/:bankAccountId/random`

### Remover Chave Pix
- **Método**: `DELETE`
- **Rota**: `/pix/keys/account/:bankAccountId/:idDaChave`

---

## 4. Transações Pix (`/pix/transactions`)

### Listar Todas as Transações
- **Método**: `GET`
- **Rota**: `/pix/transactions`

### Listar Transações de uma Conta (com filtro opcional de data)
- **Método**: `GET`
- **Rota**: `/pix/transactions/account/:bankAccountId?startDate=2026-09-01T00:00:00Z&endDate=2026-09-30T23:59:59Z`

### Realizar Transferência (Enviar Pix)
- **Método**: `POST`
- **Rota**: `/pix/transactions/:senderAccountId/transfer`
- **Body** (JSON):
```json
{
  "pixKey": "maria@email.com",
  "amount": 100.50,
  "description": "Pagamento do almoço",
  "idempotencyKey": "chave-unica-opcional-uuid"
}
```

### Receber Pix via Webhook (Simulação Externa)
- **Método**: `POST`
- **Rota**: `/pix/transactions/webhook`
- **Body** (JSON):
```json
{
  "pixKey": "joao@email.com",
  "amount": 250.00,
  "description": "Pagamento freela",
  "externalTransactionId": "id-transacao-banco-central"
}
```

### Cancelar Transação Pix
- **Método**: `PATCH`
- **Rota**: `/pix/transactions/:id/cancel`

---

## 5. Geração de Pix / QR Code (`/pix`)

### Gerar Cobrança Pix (QR Code / Copia e Cola)
- **Método**: `POST`
- **Rota**: `/pix/generate`
- **Body** (JSON):
```json
{
  "bankAccountId": "uuid-da-conta-recebedora",
  "amount": 150.00,
  "description": "Fatura 01/2026"
}
```

### Consultar Status de um Pix Gerado
- **Método**: `GET`
- **Rota**: `/pix/:id/status`

### Simular Pagamento de Pix (Simula que alguém pagou o QR Code)
- **Método**: `PATCH`
- **Rota**: `/pix/:id/simulate-payment`

---

## 6. Relatórios (`/pix/reports`)

### Gerar Relatório Geral do Usuário
- **Método**: `POST`
- **Rota**: `/pix/reports/user/:userId`

### Gerar Relatório por Período
- **Método**: `POST`
- **Rota**: `/pix/reports/user/:userId/period`
- **Body** (JSON):
```json
{
  "startDate": "2026-09-01T00:00:00Z",
  "endDate": "2026-09-30T23:59:59Z"
}
```

### Listar Relatórios Gerados do Usuário
- **Método**: `GET`
- **Rota**: `/pix/reports/user/:userId`

### Buscar Relatório Específico
- **Método**: `GET`
- **Rota**: `/pix/reports/:reportId`

---

## 7. Notificações (`/notifications`)

### Listar Todas as Notificações
- **Método**: `GET`
- **Rota**: `/notifications`

### Listar Notificações de uma Conta Específica
- **Método**: `GET`
- **Rota**: `/notifications/:accountId`
