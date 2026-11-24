// Auditoria HTTP com PostgreSQL real e schema temporário exclusivo.
// Requer npm run build. Nenhuma chamada é enviada ao backend em execução.
require('dotenv').config({ quiet: true });
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const http = require('supertest');
const { AppModule } = require('../dist/app.module');
const {
  PixTransactionService,
} = require('../dist/pix/pix-transaction/pix-transaction.service');
const tables = require('../dist/db/schema');

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.message });
    console.log(`FAIL ${name}: ${error.message}`);
  }
}
async function main() {
  if (!process.env.DB_URL) throw new Error('DB_URL não configurada.');
  const schemaName = `pix_verify_${randomUUID().replaceAll('-', '')}`;
  assert.match(schemaName, /^pix_verify_[a-f0-9]{32}$/);
  const admin = new Pool({ connectionString: process.env.DB_URL });
  let pool,
    app,
    created = false;
  try {
    await admin.query(`CREATE SCHEMA "${schemaName}"`);
    created = true;
    // Sem registros: copia somente estrutura, defaults e índices.
    for (const name of [
      'users',
      'bank_accounts',
      'pix_keys',
      'pix_transactions',
      'reports',
    ]) {
      await admin.query(
        `CREATE TABLE "${schemaName}".${name} (LIKE public.${name} INCLUDING ALL)`,
      );
    }
    // LIKE não copia FKs: reproduz os vínculos definidos em src/db/schema.ts.
    for (const [table, column, target] of [
      ['bank_accounts', 'user_id', 'users'],
      ['pix_keys', 'bank_account_id', 'bank_accounts'],
      ['pix_transactions', 'bank_account_id', 'bank_accounts'],
      ['pix_transactions', 'sender_account_id', 'bank_accounts'],
      ['pix_transactions', 'receiver_account_id', 'bank_accounts'],
      ['pix_transactions', 'pix_key_id', 'pix_keys'],
      ['reports', 'user_id', 'users'],
    ])
      await admin.query(
        `ALTER TABLE "${schemaName}".${table} ADD FOREIGN KEY (${column}) REFERENCES "${schemaName}".${target}(id)`,
      );
    pool = new Pool({
      connectionString: process.env.DB_URL,
      options: `-c search_path=${schemaName}`,
    });
    assert.equal(
      (await pool.query('select current_schema() as name')).rows[0].name,
      schemaName,
    );
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider('DRIZZLE')
      .useValue(drizzle(pool, { schema: tables }))
      .compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    // A execução do agendador será acionada explicitamente no teste, sem depender do relógio.
    const { SchedulerRegistry } = require('@nestjs/schedule');
    for (const job of app.get(SchedulerRegistry).getCronJobs().values())
      job.stop();
    const request = http(app.getHttpServer());
    async function call(
      method,
      path,
      body,
      expected = method === 'post' ? 201 : 200,
    ) {
      let req = request[method](path);
      if (body !== undefined) req = req.send(body);
      const response = await req;
      assert.equal(
        response.status,
        expected,
        `${method.toUpperCase()} ${path.replace(/[a-f0-9-]{36}/g, ':id')}: HTTP ${response.status} ${JSON.stringify(response.body)}`,
      );
      return response.body;
    }
    const userA = await call('post', '/users', {
      name: 'Verificação A',
      cpf: '52998224725',
      email: 'a@example.com',
      phone: '11999999999',
    });
    const userB = await call('post', '/users', {
      name: 'Verificação B',
      cpf: '11144477735',
      email: 'b@example.com',
      phone: '11988888888',
    });
    const a = await call('post', '/bank-accounts', { userId: userA.id });
    const b = await call('post', '/bank-accounts', { userId: userB.id });
    const keyA = await call('post', `/pix/keys/account/${a.id}`, {
      key: 'a@example.com',
    });
    const keyB = await call('post', `/pix/keys/account/${b.id}`, {
      key: 'b@example.com',
    });
    const balance = async (id) =>
      Number((await call('get', `/bank-accounts/${id}/balance`)).balance);
    const transfer = (amount, extras = {}) =>
      call('post', `/pix/transactions/${a.id}/transfer`, {
        pixKey: keyB.key,
        amount,
        idempotencyKey: randomUUID(),
        ...extras,
      });

    await check('Usuários: listar e consultar cadastro', async () => {
      assert.equal((await call('get', '/users')).length, 2);
      assert.equal(
        (await call('get', `/users/${userA.id}`)).email,
        'a@example.com',
      );
    });
    await check(
      'Usuários: CPF inválido e duplicado são rejeitados',
      async () => {
        await call(
          'post',
          '/users',
          {
            name: 'Inválido',
            cpf: '11111111111',
            email: 'v@example.com',
            phone: '11999999999',
          },
          400,
        );
        await call(
          'post',
          '/users',
          {
            name: 'Duplicado',
            cpf: userA.cpf,
            email: 'v@example.com',
            phone: '11999999999',
          },
          400,
        );
      },
    );
    await check(
      'Contas: consulta por conta e titular; duplicidade',
      async () => {
        assert.equal(
          (await call('get', `/bank-accounts/${a.id}`)).userId,
          userA.id,
        );
        assert.equal(
          (await call('get', `/bank-accounts/user/${userA.id}`)).id,
          a.id,
        );
        await call('post', '/bank-accounts', { userId: userA.id }, 409);
      },
    );
    await check('Depósito manual credita o valor exato', async () => {
      await call('patch', `/bank-accounts/${a.id}/balance`, { amount: 1000 });
      assert.equal(await balance(a.id), 1000);
    });
    await check('Bloqueio manual impede envio; ativação libera', async () => {
      await call('patch', `/bank-accounts/${a.id}/block`);
      await call(
        'post',
        `/pix/transactions/${a.id}/transfer`,
        { pixKey: keyB.key, amount: 1 },
        400,
      );
      await call('patch', `/bank-accounts/${a.id}/activate`);
      assert.equal(
        (await call('get', `/bank-accounts/${a.id}`)).status,
        'ACTIVE',
      );
    });
    await check(
      'Chaves: geração aleatória, edição, troca de conta e remoção sem vínculos',
      async () => {
        let k = await call('post', `/pix/keys/account/${a.id}/random`);
        assert.equal(k.type, 'RANDOM');
        k = await call('patch', `/pix/keys/account/${a.id}/${k.id}`, {
          key: 'editada@example.com',
          newBankAccountId: b.id,
        });
        assert.equal(k.bankAccountId, b.id);
        k = await call('patch', `/pix/keys/account/${b.id}/${k.id}/random`);
        assert.equal(k.type, 'RANDOM');
        await call('delete', `/pix/keys/account/${b.id}/${k.id}`);
        assert(
          !(await call('get', `/pix/keys/account/${b.id}`)).some(
            (row) => row.id === k.id,
          ),
        );
      },
    );
    await check('Chaves: suspender e desbloquear altera o status', async () => {
      assert.equal(
        (
          await call('patch', `/pix/keys/account/${b.id}/${keyB.id}/suspend`, {
            reason: 'Teste',
          })
        ).status,
        'SUSPENDED',
      );
      assert.equal(
        (await call('patch', `/pix/keys/account/${b.id}/${keyB.id}/unblock`))
          .status,
        'ACTIVE',
      );
    });
    let completed;
    await check(
      'Transferência: debita origem, credita destino e retorna comprovante',
      async () => {
        completed = (await transfer(100)).transaction;
        assert.equal(completed.status, 'COMPLETED');
        assert.equal(await balance(a.id), 900);
        assert.equal(await balance(b.id), 100);
      },
    );
    await check(
      'Transferência: idempotência impede débito duplicado',
      async () => {
        const before = await balance(a.id);
        await call(
          'post',
          `/pix/transactions/${a.id}/transfer`,
          {
            pixKey: keyB.key,
            amount: 100,
            idempotencyKey: completed.idempotencyKey,
          },
          409,
        );
        assert.equal(await balance(a.id), before);
      },
    );
    await check(
      'Transferência: saldo insuficiente e autoenvio são rejeitados',
      async () => {
        await call(
          'post',
          `/pix/transactions/${a.id}/transfer`,
          { pixKey: keyB.key, amount: 2000 },
          400,
        );
        await call(
          'post',
          `/pix/transactions/${a.id}/transfer`,
          { pixKey: keyA.key, amount: 1 },
          400,
        );
      },
    );
    await check('Cancelamento estorna exatamente uma vez', async () => {
      const canceled = await call(
        'patch',
        `/pix/transactions/${completed.id}/cancel`,
      );
      assert.equal(canceled.transaction.status, 'CANCELED');
      assert.equal(await balance(a.id), 1000);
      assert.equal(await balance(b.id), 0);
      await call(
        'patch',
        `/pix/transactions/${completed.id}/cancel`,
        undefined,
        400,
      );
    });
    await check(
      'Limite diário rejeita excesso e permite o limite exato',
      async () => {
        await call('patch', `/bank-accounts/${a.id}/daily-limit`, {
          dailyLimit: 50,
        });
        await call(
          'post',
          `/pix/transactions/${a.id}/transfer`,
          { pixKey: keyB.key, amount: 51 },
          400,
        );
        assert.equal((await transfer(50)).transaction.status, 'COMPLETED');
        await call('patch', `/bank-accounts/${a.id}/daily-limit`, {
          dailyLimit: 1000,
        });
      },
    );
    let scheduled;
    await check('Agendamento fica visível sem debitar saldo', async () => {
      const before = await balance(a.id);
      scheduled = await call('post', `/pix/transactions/${a.id}/schedule`, {
        pixKey: keyB.key,
        amount: 20,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        idempotencyKey: randomUUID(),
      });
      assert.equal(scheduled.status, 'SCHEDULED');
      assert.equal(await balance(a.id), before);
      assert(
        (await call('get', `/pix/transactions/account/${a.id}/scheduled`)).some(
          (row) => row.id === scheduled.id,
        ),
      );
    });
    await check('Agendamento: cancelar não altera saldo', async () => {
      const before = await balance(a.id);
      await call('patch', `/pix/transactions/${scheduled.id}/cancel`);
      assert.equal(await balance(a.id), before);
    });
    await check(
      'Agendamento: execução efetiva ocorre uma única vez',
      async () => {
        const tx = await call('post', `/pix/transactions/${a.id}/schedule`, {
          pixKey: keyB.key,
          amount: 10,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        });
        const before = await balance(a.id);
        await pool.query(
          "update pix_transactions set scheduled_at=now()-interval '1 minute' where id=$1",
          [tx.id],
        );
        await app.get(PixTransactionService).runDueScheduled();
        assert.equal(await balance(a.id), before - 10);
        await app.get(PixTransactionService).runDueScheduled();
        assert.equal(await balance(a.id), before - 10);
      },
    );
    await check(
      'Agendamento sem saldo falha sem débito e gera notificação',
      async () => {
        const tx = await call('post', `/pix/transactions/${a.id}/schedule`, {
          pixKey: keyB.key,
          amount: 2000,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        });
        const before = await balance(a.id);
        await pool.query(
          "update pix_transactions set scheduled_at=now()-interval '1 minute' where id=$1",
          [tx.id],
        );
        await app.get(PixTransactionService).runDueScheduled();
        assert.equal(
          (
            await pool.query(
              'select status from pix_transactions where id=$1',
              [tx.id],
            )
          ).rows[0].status,
          'FAILED',
        );
        assert.equal(await balance(a.id), before);
        assert(
          (await call('get', `/notifications/${a.id}`)).some(
            (row) => row.transactionId === tx.id && row.type === 'FAILED',
          ),
        );
      },
    );
    await check(
      'Extrato: direção de envio/recebimento e filtro por período',
      async () => {
        const history = await call(
          'get',
          `/pix/transactions/account/${a.id}/history`,
        );
        assert(history.transactions.some((row) => row.direction === 'SENT'));
        const rows = await call(
          'get',
          `/pix/transactions/account/${a.id}?startDate=2000-01-01&endDate=2000-01-02`,
        );
        assert.equal(rows.length, 0);
      },
    );
    await check(
      'Notificações: eventos de envio, recebimento e cancelamento por conta',
      async () => {
        const notifications = await call('get', `/notifications/${a.id}`);
        assert(notifications.some((row) => row.type === 'TRANSFER'));
        assert(notifications.some((row) => row.type === 'CANCELED'));
        assert(
          (await call('get', `/notifications/${b.id}`)).some(
            (row) => row.type === 'RECEIVE',
          ),
        );
      },
    );
    await check(
      'Cobranças: gerar código, consultar e simular pagamento sem crédito',
      async () => {
        const before = await balance(b.id);
        const charge = await call('post', '/pix/generate', {
          bankAccountId: b.id,
          amount: 25,
          description: 'Teste de cobrança',
        });
        assert(charge.pixCode);
        assert.equal(
          (await call('get', `/pix/${charge.id}/status`)).status,
          'PENDING',
        );
        assert.equal(
          (await call('patch', `/pix/${charge.id}/simulate-payment`)).status,
          'PAID',
        );
        assert.equal(await balance(b.id), before);
      },
    );
    await check(
      'Relatórios: gerar geral/período, listar e consultar',
      async () => {
        const result = await call('post', `/pix/reports/user/${userA.id}`);
        assert.equal(
          (await call('get', `/pix/reports/${result.report.id}`)).userId,
          userA.id,
        );
        const day = new Date().toISOString().slice(0, 10);
        assert.equal(
          (
            await call('post', `/pix/reports/user/${userA.id}/period`, {
              startDate: day,
              endDate: day,
            })
          ).report.type,
          'PERIOD',
        );
        assert.equal(
          (await call('get', `/pix/reports/user/${userA.id}`)).length,
          2,
        );
        await call(
          'post',
          `/pix/reports/user/${userA.id}/period`,
          { startDate: '2026-12-31', endDate: '2026-01-01' },
          400,
        );
      },
    );
    // Casos que precisam respeitar regras de negócio, além de HTTP 200.
    await check(
      'Regra: chave suspensa deve impedir transferência',
      async () => {
        await call('patch', `/pix/keys/account/${b.id}/${keyB.id}/suspend`);
        try {
          await call(
            'post',
            `/pix/transactions/${a.id}/transfer`,
            { pixKey: keyB.key, amount: 1, idempotencyKey: randomUUID() },
            400,
          );
        } finally {
          await call('patch', `/pix/keys/account/${b.id}/${keyB.id}/unblock`);
        }
      },
    );
    await check(
      'Regra: total enviado do relatório deve refletir apenas operações concluídas',
      async () => {
        const result = await call('post', `/pix/reports/user/${userA.id}`);
        const expected = result.transactions
          .filter(
            (row) => row.senderAccountId === a.id && row.status === 'COMPLETED',
          )
          .reduce((sum, row) => sum + Number(row.amount), 0);
        assert.equal(
          Number(result.report.totalSent),
          expected,
          'Total enviado inclui operações canceladas',
        );
      },
    );
    await check('Contas: remoção de conta sem dependências', async () => {
      const user = await call('post', '/users', {
        name: 'Removível',
        cpf: '12345678909',
        email: 'remover@example.com',
        phone: '11999999999',
      });
      const account = await call('post', '/bank-accounts', { userId: user.id });
      await call('delete', `/bank-accounts/${account.id}`);
      await call('get', `/bank-accounts/${account.id}`, undefined, 404);
    });
    await check(
      'Contas: vínculos impedem exclusão com erro de negócio (409)',
      async () => {
        await call('delete', `/bank-accounts/${a.id}`, undefined, 409);
      },
    );
    await check(
      'Chaves: vínculos impedem exclusão com erro de negócio (409)',
      async () => {
        await call(
          'delete',
          `/pix/keys/account/${b.id}/${keyB.id}`,
          undefined,
          409,
        );
      },
    );
    await check(
      'Fraude: bloqueio explícito impede reativação comum',
      async () => {
        assert.equal(
          (
            await call('patch', `/bank-accounts/${a.id}/block-fraud`, {
              reason: 'Teste isolado',
            })
          ).blockedReason,
          'SUSPECTED_FRAUD',
        );
        await call('patch', `/bank-accounts/${a.id}/activate`, undefined, 400);
      },
    );
    await check(
      'Fraude: atualização genérica também deve impedir reativação sem revisão',
      async () => {
        await call(
          'patch',
          `/bank-accounts/${a.id}`,
          { status: 'ACTIVE' },
          400,
        );
      },
    );
    await check('Webhook: recebimento credita uma única vez', async () => {
      const before = await balance(b.id);
      const body = {
        pixKey: keyB.key,
        amount: 5,
        externalTransactionId: randomUUID(),
      };
      await call('post', '/pix/transactions/webhook', body);
      await call('post', '/pix/transactions/webhook', body);
      assert.equal(await balance(b.id), before + 5);
    });
    console.log(
      `RESULTADO: ${results.filter((row) => row.status === 'PASS').length}/${results.length} verificações aprovadas.`,
    );
    if (results.some((row) => row.status === 'FAIL')) process.exitCode = 1;
  } finally {
    if (app) await app.close();
    if (pool) await pool.end();
    // Exclusivamente o schema gerado e criado por esta execução.
    if (created) await admin.query(`DROP SCHEMA "${schemaName}" CASCADE`);
    await admin.end();
    console.log(
      'Schema temporário removido; dados públicos não foram modificados.',
    );
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
