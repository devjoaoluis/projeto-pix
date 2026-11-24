# Roteiro de demonstração

## Antes de começar
- Docker Desktop **ligado** (leva ~1 min para ficar pronto).
- Portas livres: 8080 (painel), 3000 (API), 3001 (Grafana), 9090 (Prometheus), 5433 (banco).
- Primeira vez: `cp .env.example .env`. O build inicial leva alguns minutos; ensaie antes.

## Subir e desligar
```bash
docker compose up -d --build     # banco, seed, API, painel, Prometheus, Grafana
docker compose down -v           # desliga e apaga os dados da demonstração
```

## Endereços
| O quê | URL |
|---|---|
| Painel web | http://localhost:8080 |
| API | http://localhost:3000/api/v1 |
| Saúde da API | http://localhost:3000/health |
| Métricas | http://localhost:3000/metrics |
| Grafana (admin/admin) | http://localhost:3001 |
| Prometheus | http://localhost:9090 |

Login do painel: usuário ADMIN criado pelo seed, e-mail `teste@exemplo.com` (a senha está em `src/db/seed.ts`).

## Roteiro sugerido (≈ 5 min)
1. **Entrar** no painel com o ADMIN.
2. **Usuários**: cadastrar dois usuários (CPF válido, ex.: 529.982.247-25 e 111.444.777-35).
3. **Contas**: criar uma conta para cada um; creditar saldo na primeira (ação de administrador).
4. **Chaves Pix**: gerar uma chave aleatória para a segunda conta.
5. **Transferências**: transferir da primeira para a segunda pela chave; conferir saldos e o histórico.
6. **Cobranças**: gerar uma cobrança e usar "Simular pagamento".
7. **Notificações** e **Relatórios**: mostrar o aviso da transferência e gerar o relatório do usuário.
8. **Cancelar** a transferência: o saldo volta para a conta de origem.
9. **Observabilidade**: abrir o Grafana (pasta "Projeto Pix", dashboard "Projeto Pix API - Observabilidade") e o `/health`.

## Se algo falhar (plano B)
- Painel não abre: use `pix-api.http` (REST Client) contra `http://localhost:3000/api/v1`.
- Docker não sobe: mostre os Code Slides (projeto "Projeto PIX - Entregas 1 a 3") e o CI verde no GitHub.
- Porta ocupada: troque a porta no `.env` (`FRONTEND_PORT`, `API_PORT`...) e suba de novo.

## Observações
- Usuário comum entra no painel, mas as listagens gerais (usuários, contas, transações) são só do ADMIN.
- "Simular pagamento" só funciona porque o `.env.example` liga `ALLOW_PAYMENT_SIMULATION`; em produção deve ficar desligado.
