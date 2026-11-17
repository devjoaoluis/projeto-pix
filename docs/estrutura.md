# Fluxo PIX

Cadastrar usuário
  ↓
Criar conta bancária vinculada
  ↓
Associar chave PIX ou gerar chave aleatória
  ↓
Validar chave PIX
  ↓
Transferir valor
  ├─ validar usuário, chave, saldo e idempotência
  ├─ reservar saldo em transação
  ├─ enviar ao provedor PIX
  └─ atualizar status via webhook
  ↓
Receber PIX
  └─ webhook confirma entrada e credita a conta




  
# Estrutura de pastas

```text
src/
├── app.controller.spec.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
├── main.ts
├── bank-account/
│   ├── bank-account.controller.ts
│   ├── bank-account.module.ts
│   ├── bank-account.service.ts
│   ├── dto/
│   │   ├── create-bank-account.dto.ts
│   │   ├── update-balance.dto.ts
│   │   └── update-bank-account.dto.ts
│   └── enums/
│       └── bank-account-status.enu.ts
├── db/
│   ├── db.module.ts
│   ├── db.provider.ts
│   ├── schema.ts
│   └── seed.ts
├── models/
│   ├── ChavePix.ts
│   ├── ContaBancaria.ts
│   ├── MemoriaDatabase.ts
│   ├── Transacao.ts
│   └── Usuario.ts
├── modules/
│   └── usuarios/
│       ├── users.controller.ts
│       ├── users.module.ts
│       ├── users.repository.ts
│       ├── users.service.ts
│       └── dto/
│           └── create-user.dto.ts
├── notification/
│   ├── notification.controller.spec.ts
│   ├── notification.controller.ts
│   ├── notification.module.ts
│   ├── notification.service.spec.ts
│   └── notification.service.ts
└── pix/
    ├── pix.controller.ts
    ├── pix.module.ts
    ├── pix.service.ts
    ├── decorators/
    │   └── is-pix-key.validator.ts
    ├── dto/
    │   ├── create-pix.dto.ts
    │   └── update-pix.dto.ts
    ├── pix-key/
    │   ├── pix-key.controller.ts
    │   ├── pix-key.service.ts
    │   ├── dto/
    │   │   └── create-pix-key.dto.ts
    │   └── enums/
    │       └── pix-key-type.enum.ts
    ├── pix-transaction/
    │   ├── pix-transaction.controller.spec.ts
    │   ├── pix-transaction.controller.ts
    │   ├── pix-transaction.service.spec.ts
    │   ├── pix-transaction.service.ts
    │   └── dto/
    │       ├── filter-pix-transactions.dto.ts
    │       ├── receive-pix.dto.ts
    │       └── transfer-pix.dto.ts
    └── reports/
        ├── reports.controller.ts
        ├── reports.module.ts
        ├── reports.service.ts
        └── dto/
            └── report-filter.dto.ts
```