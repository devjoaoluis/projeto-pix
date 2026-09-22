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

  src/
├── user/
│   ├── user.module.ts
│   ├── user.controller.ts
│   ├── user.service.ts
│   ├── user.entity.ts
│   └── dto/
│       ├── create-user.dto.ts
│       └── update-user.dto.ts
│
├── bank-account/
│   ├── bank-account.module.ts
│   ├── bank-account.controller.ts
│   ├── bank-account.service.ts
│   ├── bank-account.entity.ts
│   └── dto/
│       ├── create-account.dto.ts
│       └── update-account.dto.ts
│
└── pix/
    ├── pix.module.ts
    ├── pix-key/
    │   ├── pix-key.entity.ts
    │   ├── pix-key.service.ts
    │   ├── pix-key.controller.ts
    │   └── dto/
    │       ├── generate-key.dto.ts
    │       ├── validate-key.dto.ts
    │       └── associate-key.dto.ts
    ├── pix-transaction/
    │   ├── pix-transaction.entity.ts
    │   ├── pix-transaction.service.ts
    │   ├── pix-transaction.controller.ts
    │   └── dto/
    │       ├── receive-pix.dto.ts
    │       └── transfer-pix.dto.ts
    └── pix.module.ts