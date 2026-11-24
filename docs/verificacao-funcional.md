# Verificação funcional do Projeto Pix — 24/11/2026

## Resultado

O painel apresenta as oito áreas principais e os controles testados enviam os dados esperados. Ele não expõe todas as capacidades da API. Há cinco falhas reproduzidas no backend; portanto, o funcionamento completo ainda não está aprovado.

Esta auditoria adicionou testes e documentação. Não alterou as regras da aplicação nem as contas existentes.

## Evidências e limites

| Verificação | Resultado | O que comprova |
| --- | --- | --- |
| Testes existentes do backend | 130 aprovados, 10 suites | Casos unitários já presentes no repositório |
| Testes do frontend | 54 aprovados, 6 arquivos | Rotas, navegação, formulários, confirmações, argumentos enviados aos serviços, validações, cache e consulta periódica de cobrança |
| Integração HTTP + PostgreSQL | 23 aprovadas, 5 falharam, de 28 verificações | Controllers reais, ValidationPipe, persistência, saldos, estornos, agendador e relatórios |
| Build NestJS e build React | Aprovados | Compilação dos projetos |

Os 30 novos testes de tela usam a API simulada, com componentes React e menus/dialogs reais. Eles complementam a integração do backend com PostgreSQL; não equivalem a um teste completo do navegador conectado à API para cada operação. A inspeção visual do navegador não foi repetida nesta auditoria.

A integração cria um schema vazio e exclusivo `pix_verify_<uuid>`, copia a estrutura das tabelas locais, reproduz as chaves estrangeiras e substitui a conexão `DRIZZLE` apenas na instância Nest de teste. Requisições são feitas com Supertest, sem acessar o backend em execução. O cron automático da instância de teste é parado; sua execução é acionada explicitamente. O schema é removido ao terminar. A checagem final confirmou zero schemas temporários restantes. Nenhum registro do schema público foi inserido, alterado ou removido.

## Cobertura da interface

| Área | Disponível no painel | Resultado e ressalvas |
| --- | --- | --- |
| Visão geral | Saldo consolidado, quantidade de contas/usuários/transações, movimentações recentes e notificações | Renderização, dados dos serviços e atalho de transferência aprovados nos testes de componentes |
| Usuários | Listar, filtrar, consultar detalhes e cadastrar | Cadastro envia CPF/telefone sem máscara; API rejeita CPF inválido e duplicado. Edição/exclusão não existem no controller |
| Contas | Listar/filtrar, consultar saldo/detalhes, criar, depositar, limitar, bloquear, ativar e remover | Confirmações e payloads aprovados. Remoção de conta com vínculos retorna erro 500; conta sem dependências é removida |
| Chaves | Listar por conta, criar manual/aleatória, editar/trocar conta, substituir valor por UUID, suspender, desbloquear e remover | Alterações de status são persistidas. Suspensão não impede transferência no backend. Remoção de chave usada retorna erro 500 |
| Transferências | Enviar, revisar, confirmar, consultar histórico por conta/período, agendar, filtrar agendadas e cancelar | Débito/crédito, idempotência, limite diário, estorno e agendamentos aprovados na integração. A tabela não apresenta direção relativa à conta |
| Cobranças | Criar, listar via transações, consultar status, copiar código e simular pagamento | Código e status são retornados pela API. Simulação muda para PAID sem creditar saldo, conforme a implementação. Consulta periódica para quando a cobrança é paga |
| Notificações | Listar gerais e filtrar por conta | Eventos de envio, recebimento, cancelamento e falha de agendamento confirmados. Marcar como lida não existe na API |
| Relatórios | Gerar geral/período, listar e consultar por ID | Rotas e persistência funcionam. Totais incluem operações canceladas e falhas; não representam somente valores efetivamente enviados |

Nos formulários e menus, foram testados: cadastro de usuário/conta; depósito; limite zero; bloqueio/ativação/remoção de conta; cadastro de chave manual/aleatória; suspensão/desbloqueio; edição/substituição/remoção de chave; revisão/confirmação de transferência imediata/agendada; cancelamento; criação de cobrança; geração dos dois tipos de relatório; filtro de notificações. As oito rotas e oito links da navegação também foram conferidos por testes.

## Funções da API sem controle próprio no painel

| Capacidade | Contrato existente | Situação |
| --- | --- | --- |
| Bloquear por suspeita de fraude | PATCH /bank-accounts/:id/block-fraud | Sem ação no menu; existe apenas o bloqueio manual comum |
| Atualização genérica de conta | PATCH /bank-accounts/:id | Sem formulário; permite alterar `userId` e `status` |
| Consulta direta por titular | GET /bank-accounts/user/:userId | Serviço existe no frontend, mas a tela usa filtro da listagem em vez desta rota |
| Extrato com direção e saldo atual | GET /pix/transactions/account/:id/history | A tela usa /account/:id e não mostra SENT/RECEIVED/CHARGE nem contraparte calculada |
| Recebimento externo por webhook | POST /pix/transactions/webhook | Sem botão, coerente com integração externa; recebimento idempotente foi aprovado na integração isolada |
| Localização opcional de envio/agendamento | Campos `latitude` e `longitude` dos DTOs | Não são coletados nem enviados pelo formulário |
| Resultado da análise de fraude | `fraudEvaluation` na resposta de transferência | A interface aproveita a transação, mas não apresenta score/regras/bloqueio retornados |

Aliases de rotas, PUT/PATCH equivalentes e nomes alternativos de suspensão/desbloqueio não representam funções adicionais que precisem de botões separados. A listagem dedicada de agendamentos existe na API; no painel, a função equivalente é feita filtrando transações com status SCHEDULED.

## Falhas reproduzidas

### 1. Suspensão da chave não impede envio — prioridade alta

Suspender uma chave retorna `SUSPENDED`. Enviar R$ 1,00 para essa chave em seguida retorna HTTP 201, com a transação `COMPLETED` e saldo movimentado. A consulta interna `resolvePixKey` em `src/pix/pix-transaction/pix-transaction.service.ts` verifica existência, mas não verifica o status da chave. A mesma consulta é usada por transferência, agendamento e recebimento externo.

Esperado: recusar uso da chave suspensa/bloqueada antes de movimentar saldo. A validação precisa ocorrer na API; uma correção somente na interface não protege chamadas diretas.

### 2. Bloqueio por fraude pode ser contornado pela atualização genérica — prioridade alta

Após PATCH /bank-accounts/:id/block-fraud, a rota /activate corretamente rejeita reativação. Porém PATCH /bank-accounts/:id com `{"status":"ACTIVE"}` retorna HTTP 200 e a conta fica ativa, ainda com `blockedReason=SUSPECTED_FRAUD`. A função `update` em `src/bank-account/bank-account.service.ts` grava o DTO diretamente sem a regra da função `activate`.

Esperado: aplicar a restrição de revisão também na atualização genérica. Não foi comprovado um fluxo legítimo de revisão; não há tela para isso no painel.

### 3. Relatórios somam operações sem efeito financeiro — prioridade média

Na sequência de teste, o relatório mostrou R$ 2.181,00 enviados, enquanto a soma de transferências `COMPLETED` foi R$ 61,00. A diferença veio de transferências canceladas e de um agendamento que falhou. `calculateTotals` em `src/pix/reports/reports.service.ts` soma pelo remetente/destinatário sem filtrar status.

Esperado para o rótulo “Total enviado”: refletir transferências efetivadas. Caso a intenção seja medir volume bruto de tentativas, essa regra e o rótulo precisam deixar isso explícito. O frontend atualmente apresenta os totais recebidos da API.

### 4. Remoção de conta com dependências retorna erro interno — prioridade média

DELETE /bank-accounts/:id em uma conta com chaves/transações retorna HTTP 500. `remove` em `src/bank-account/bank-account.service.ts` tenta excluir sem tratar o conflito de chave estrangeira.

Esperado: erro de negócio claro, como HTTP 409 com explicação dos vínculos. Remoção de conta sem dependências passou. Não é necessário apagar o histórico para corrigir a mensagem.

### 5. Remoção de chave utilizada retorna erro interno — prioridade média

DELETE /pix/keys/account/:conta/:id para uma chave referenciada por transações retorna HTTP 500. `remove` em `src/pix/pix-key/pix-key.service.ts` não trata o vínculo do histórico.

Esperado: erro de negócio claro, como HTTP 409, ou outra política explícita que preserve o histórico. Remoção de chave sem vínculos passou.

## Reproduzir

Na raiz:

```powershell
npm test -- --runInBand
npm run build
node scripts/verify-pix-functions.cjs
```

O último comando exige `DB_URL` configurada, permissão para criar schema e as tabelas públicas atualizadas. Ele termina com código 1 enquanto as cinco falhas acima estiverem presentes, depois de remover seu schema temporário. O script usa o build em `dist`, portanto compile novamente após modificar o backend.

No frontend:

```powershell
cd frontend
npm test
npm run build
```

O resultado aprovado dos testes unitários e de componentes não invalida as falhas encontradas pela integração. Concorrência elevada, todos os cenários das regras de fraude, acessibilidade completa e execução em navegadores diferentes não foram auditados nesta rodada.
