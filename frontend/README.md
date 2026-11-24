# Projeto Pix · Frontend

Painel em React, TypeScript, Vite, Tailwind CSS, componentes shadcn/ui com Radix, React Router, TanStack Query, React Hook Form, Zod e Lucide. A interface usa somente dados da API; a API exige JWT, então o painel tem tela de login; o token fica só em `sessionStorage` (some ao fechar a aba). Entre com o usuário ADMIN criado por `npm run seed` (veja `src/db/seed.ts`), pois as listagens gerais são restritas a ADMIN.

## Executar localmente

Use Node.js 22 LTS ou superior e npm. Na raiz do repositório, instale e inicie o backend:

```powershell
npm install
# Configure DB_URL no .env conforme seu PostgreSQL.
# Para o PostgreSQL local do docker-compose.yml:
docker compose up -d postgres
npm run db:push
# Opcional: popula dados de demonstração no banco.
# npm run seed
npm run start:dev
```

O backend espera `DB_URL` (o exemplo de conexão está em `.env.example`). Configure `TZ=America/Sao_Paulo` para o limite diário. O banco do Compose usa a porta 5433 no host. Não execute seed em um banco com dados que queira preservar sem revisar `src/db/seed.ts`.

Em outro terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Abra http://127.0.0.1:5173. `VITE_API_URL` define o destino do proxy de desenvolvimento (padrão `http://localhost:3000`); o navegador usa `/api/v1` (o Vite encaminha para a API sem reescrever o caminho), evitando depender de CORS no NestJS. Reinicie o Vite após alterar o ambiente.

## Compilar e verificar

```powershell
npm run build
npm test
```

O build estático fica em `frontend/dist`. `npm run preview` serve esse build para inspeção, mas não inicia a API nem fornece o proxy de desenvolvimento.

## Hospedagem

Sirva `dist` com fallback de rotas para `index.html`. Configure um proxy reverso de `/api/*` para a API NestJS, mantendo o caminho (a API responde em `/api/v1`). Alternativamente, defina `VITE_API_BASE_PATH=https://sua-api` antes do build; nesse caso, o servidor da API precisa permitir CORS para a origem do frontend. As variáveis `VITE_*` são públicas; nunca inclua credenciais. Não houve alteração de comportamento do backend; somente a exclusão da pasta `frontend` das configurações TypeScript da raiz.

## Telas e contratos

| Tela | Operações conectadas |
| --- | --- |
| Visão geral | GET de contas, usuários, transações e notificações; saldo consolidado calculado sobre os saldos retornados |
| Usuários | GET /users, GET /users/:id, POST /users; CPF com dígitos verificadores e máscaras de CPF/telefone |
| Contas | GET /bank-accounts e /:id, GET /:id/balance, POST /bank-accounts, PATCH /:id/balance, /:id/daily-limit, /:id/block e /:id/activate, DELETE /:id |
| Chaves | GET/POST /pix/keys/account/:conta, POST /:conta/random, PATCH /:conta/:id e /random, /suspend, /unblock; DELETE /:conta/:id |
| Transferências | GET /pix/transactions e /account/:conta com filtros; POST /:conta/transfer e /schedule; PATCH /:id/cancel |
| Cobranças | POST /pix/generate, GET /pix/:id/status, PATCH /pix/:id/simulate-payment; lista a partir das transações PIX_CHARGE |
| Notificações | GET /notifications e /notifications/:conta |
| Relatórios | POST/GET /pix/reports/user/:usuario, POST /user/:usuario/period, GET /pix/reports/:id |

Filtros de transações são enviados em ISO com os limites do dia em Brasília. Relatórios por período recebem `YYYY-MM-DD`, conforme a implementação do serviço, que acrescenta os horários internamente. Totais de relatórios seguem os critérios do backend; não são recalculados pelo frontend. Transferências usam uma chave de idempotência por revisão e preservam essa chave ao repetir uma tentativa que falhou. Mutações não são repetidas automaticamente.

## Limitações da API

- Não há endpoints para editar/excluir usuários nem para marcar notificações como lidas.
- Não há endpoint para buscar dados do destinatário pela chave antes de transferir. A confirmação mostra a chave informada; o backend valida o destino.
- A API gera um código de cobrança simulado e não retorna imagem de QR Code. A interface exibe e copia apenas `pixCode`; não gera um código bancário novo.
- Simular pagamento apenas altera o status da cobrança para `PAID`; não credita saldo. Recebimento por webhook não é acionado como pagamento pelo painel.
- Notificações ficam em memória e são perdidas ao reiniciar a API.
- Listagens não possuem paginação no servidor. A interface trabalha com os registros retornados.
- Remoção de contas pode falhar por vínculos no banco; o painel apresenta a mensagem retornada, sem tentar excluir dependências.
- Operações são administrativas e de simulação. O painel não expõe o webhook externo nem funções de bloqueio por fraude como ações comuns.

## Organização

`src/services` centraliza HTTP; `types` descreve respostas; `hooks` mantém queries/mutações; `lib` contém máscaras e validação; `components/ui` contém os componentes shadcn/ui adaptados; `pages` contém as oito telas. `components.json` configura aliases e o estilo para adicionar componentes shadcn/ui.

## Verificação desta entrega

A auditoria funcional posterior, com a comparação entre funções da API e controles do painel e cinco falhas reproduzidas, está em [docs/verificacao-funcional.md](../docs/verificacao-funcional.md). Os testes de componentes usam serviços simulados; o script de integração verifica as regras com PostgreSQL real em schema temporário.

O build e os testes cobrem valores financeiros, CPF/telefone, limites de campos, consultas HTTP, idempotência ao voltar da revisão, atualização de cache após alterações e encerramento da consulta periódica de cobranças pagas.

No navegador foram conferidos o painel com dados reais, contas, chaves por conta, revisão de transferência e validação de IDs. A largura de celular de 390 px foi verificada: o menu fechado deixa de receber foco e a página não transborda horizontalmente; tabelas mantêm sua própria rolagem.

Em 24/11/2026, os erros 500 de contas, transações e chaves foram rastreados a estruturas ausentes no banco local. A atualização aditiva (script removido depois: o esquema agora é gerenciado pelas migrations do Drizzle) foi aplicada em transação, preservando os registros. Foram acrescentados limite diário, status/suspensão de chaves, localização/agendamento de transações e a tabela de relatórios, conforme `src/db/schema.ts`. As consultas pelo proxy Vite passaram a retornar HTTP 200.

Para repetir a atualização em outro ambiente com a mesma versão antiga do banco, execute `node scripts/sync-pix-schema.cjs` na raiz com `DB_URL` configurada. O script só acrescenta estruturas conhecidas; não substitui o gerenciamento geral de migrações nem muda dados existentes. Não foram realizadas transferências ou alterações de saldo durante a verificação.
