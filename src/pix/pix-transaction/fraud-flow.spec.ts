import { Test, TestingModule } from '@nestjs/testing';

// Este arquivo não importa AppModule de propósito.
// Ele chama a API por HTTP (fetch), então roda no Jest CJS
// sem esbarrar em pacotes ESM (@nestjs/config, @nestjs/mapped-types).
//
// Pré-requisito: a API precisa estar rodando em http://localhost:3000
// (rode `npm start` em outro terminal antes de `npm run test`).

const BASE_URL = 'http://localhost:3000';

// ---------- Helpers HTTP ----------

async function http(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: any }> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

// ---------- Gerador de CPF válido ----------

function gerarCpf(): string {
  const r = () => Math.floor(Math.random() * 10);
  const n = Array.from({ length: 9 }, r);

  let d1 = n.reduce((acc, cur, i) => acc + cur * (10 - i), 0);
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;

  let d2 = [...n, d1].reduce((acc, cur, i) => acc + cur * (11 - i), 0);
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;

  return [...n, d1, d2].join('');
}

// ---------- Suite ----------

describe('Fraud Flow (integração via HTTP)', () => {
  let uniq: number;
  let senderUserId: string;
  let senderAccountId: string;
  let senderPixKey: string;
  const receivers: { accountId: string; pixKey: string }[] = [];

  beforeAll(async () => {
    // Confirma que a API está no ar antes de qualquer coisa
    const health = await http('GET', '/');
    if (health.status !== 200) {
      throw new Error(
        `API não está respondendo em ${BASE_URL}. Rode "npm start" antes de "npm run test".`,
      );
    }
  });

  beforeEach(() => {
    uniq = Date.now() + Math.floor(Math.random() * 1_000_000);
  });

  // ============================================================
  // 0. Sanity check
  // ============================================================
  it('0. API responde 200 na raiz', async () => {
    const res = await http('GET', '/');
    expect(res.status).toBe(200);
    expect(String(res.data)).toContain('API do Projeto Pix');
  });

  // ============================================================
  // 1-4. Setup do sender
  // ============================================================
  it('1. cria usuário remetente', async () => {
    const res = await http('POST', '/users', {
      name: 'Sender Fraud Test',
      cpf: gerarCpf(),
      email: `sender-${uniq}@test.com`,
      phone: `+5511${String(uniq).slice(-9)}`,
    });

    expect(res.status).toBe(201);
    expect(res.data?.id).toBeDefined();
    senderUserId = res.data.id;
  });

  it('2. cria conta bancária do remetente', async () => {
    const res = await http('POST', '/bank-accounts', {
      userId: senderUserId,
    });

    expect(res.status).toBe(201);
    expect(res.data?.id).toBeDefined();
    senderAccountId = res.data.id;
  });

  it('3. cria chave PIX do remetente', async () => {
    senderPixKey = `sender-${uniq}@test.com`;

    const res = await http('POST', `/pix/keys/account/${senderAccountId}`, {
      key: senderPixKey,
    });

    expect(res.status).toBe(201);
    expect(res.data?.key).toBe(senderPixKey);
  });

  it('4. credita R$ 20.000 via webhook', async () => {
    const res = await http('POST', '/pix/transactions/webhook', {
      pixKey: senderPixKey,
      amount: 20000,
      externalTransactionId: `seed-${uniq}`,
      description: 'Crédito inicial de teste',
    });

    expect(res.status).toBe(201);

    const saldo = await http(
      'GET',
      `/bank-accounts/${senderAccountId}/balance`,
    );
    expect(Number(saldo.data?.balance)).toBeGreaterThanOrEqual(20000);
  });

  // ============================================================
  // 5. Destinatários
  // ============================================================
  it('5. cria 6 destinatários com contas e chaves', async () => {
    for (let i = 0; i < 6; i++) {
      const u = await http('POST', '/users', {
        name: `Receiver ${i} Fraud Test`,
        cpf: gerarCpf(),
        email: `receiver-${i}-${uniq}@test.com`,
        phone: `+5511${String(uniq + i + 1).slice(-9)}`,
      });
      expect(u.status).toBe(201);

      const a = await http('POST', '/bank-accounts', { userId: u.data.id });
      expect(a.status).toBe(201);

      const k = await http('POST', `/pix/keys/account/${a.data.id}`, {
        key: `receiver-${i}-${uniq}@test.com`,
      });
      expect(k.status).toBe(201);

      receivers.push({ accountId: a.data.id, pixKey: k.data.key });
    }

    expect(receivers).toHaveLength(6);
  });

  // ============================================================
  // 6-8. Regras de fraude
  // ============================================================
  it('6. dispara HIGH_AMOUNT em transferência de R$ 6.000', async () => {
    const res = await http(
      'POST',
      `/pix/transactions/${senderAccountId}/transfer`,
      {
        pixKey: receivers[0].pixKey,
        amount: 6000,
        description: 'Transferência alta — deve disparar HIGH_AMOUNT',
      },
    );

    expect(res.status).toBe(201);
    expect(res.data?.fraudEvaluation).toBeDefined();
    expect(res.data.fraudEvaluation.triggeredRules).toContain('HIGH_AMOUNT');
  });

  it('7. dispara NEW_PIX_KEY em chave nova', async () => {
    const res = await http(
      'POST',
      `/pix/transactions/${senderAccountId}/transfer`,
      {
        pixKey: receivers[1].pixKey,
        amount: 50,
        description: 'Chave nova — deve disparar NEW_PIX_KEY',
      },
    );

    expect(res.status).toBe(201);
    expect(res.data?.fraudEvaluation).toBeDefined();
    expect(res.data.fraudEvaluation.triggeredRules).toContain('NEW_PIX_KEY');
  });

  it('8. dispara HIGH_VOLUME + MANY_RECEIVERS e bloqueia', async () => {
    let ultimaAvaliacao: any = null;

    for (let i = 2; i < receivers.length; i++) {
      const res = await http(
        'POST',
        `/pix/transactions/${senderAccountId}/transfer`,
        {
          pixKey: receivers[i].pixKey,
          amount: 1000,
          description: `Transferência ${i}`,
        },
      );

      if (res.status !== 201) break; // conta já bloqueada

      ultimaAvaliacao = res.data?.fraudEvaluation;
    }

    expect(ultimaAvaliacao).toBeDefined();
    expect(ultimaAvaliacao.triggeredRules).toContain(
      'HIGH_VOLUME_SHORT_WINDOW',
    );
    expect(ultimaAvaliacao.triggeredRules).toContain('MANY_RECEIVERS');
  });

  // ============================================================
  // 9. Bloqueio manual por fraude
  // ============================================================
  it('9. bloqueio manual por fraude (ou reconhece já bloqueada)', async () => {
    const res = await http(
      'PATCH',
      `/bank-accounts/${senderAccountId}/block-fraud`,
      { reason: 'Teste manual de bloqueio por suspeita de fraude' },
    );

    if (res.status === 200) {
      expect(res.data.status).toBe('BLOCKED');
      expect(res.data.blockedReason).toBe('SUSPECTED_FRAUD');
      expect(res.data.blockedAt).toBeTruthy();
    } else if (res.status === 409) {
      expect(res.status).toBe(409);
    } else {
      throw new Error(
        `Status inesperado: ${res.status} — ${JSON.stringify(res.data)}`,
      );
    }
  });

  // ============================================================
  // 10. Verificações pós-bloqueio
  // ============================================================
  it('10a. conta está BLOCKED / SUSPECTED_FRAUD', async () => {
    const acc = await http('GET', `/bank-accounts/${senderAccountId}`);
    expect(acc.data.status).toBe('BLOCKED');
    expect(acc.data.blockedReason).toBe('SUSPECTED_FRAUD');
  });

  it('10b. transferir de conta bloqueada → 400', async () => {
    const res = await http(
      'POST',
      `/pix/transactions/${senderAccountId}/transfer`,
      {
        pixKey: receivers[0].pixKey,
        amount: 100,
      },
    );
    expect(res.status).toBe(400);
    expect(String(res.data?.message)).toMatch(/bloqueada|inativa/i);
  });

  it('10c. reativar conta fraud-blocked → 400', async () => {
    const res = await http(
      'PATCH',
      `/bank-accounts/${senderAccountId}/activate`,
    );
    expect(res.status).toBe(400);
    expect(String(res.data?.message)).toMatch(/suspeita de fraude/i);
  });

  it('10d. bloquear novamente → 409', async () => {
    const res = await http(
      'PATCH',
      `/bank-accounts/${senderAccountId}/block-fraud`,
      { reason: 'Duplicado' },
    );
    expect(res.status).toBe(409);
  });

  // ============================================================
  // 11. Bloqueio MANUAL e reativação
  // ============================================================
  it('11. bloqueio MANUAL grava motivo e permite reativação', async () => {
    const u = await http('POST', '/users', {
      name: 'Manual Block Test',
      cpf: gerarCpf(),
      email: `manual-${uniq}@test.com`,
      phone: `+5511${String(uniq + 100).slice(-9)}`,
    });
    expect(u.status).toBe(201);

    const a = await http('POST', '/bank-accounts', { userId: u.data.id });
    expect(a.status).toBe(201);

    const block = await http('PATCH', `/bank-accounts/${a.data.id}/block`);
    expect(block.status).toBe(200);
    expect(block.data.blockedReason).toBe('MANUAL');

    const activate = await http(
      'PATCH',
      `/bank-accounts/${a.data.id}/activate`,
    );
    expect(activate.status).toBe(200);
    expect(activate.data.status).toBe('ACTIVE');
    expect(activate.data.blockedReason).toBeNull();
  });

  // ============================================================
  // 12. Histórico de transações
  // ============================================================
  it('12a. GET /pix/transactions/account/:id/history retorna histórico', async () => {
    const res = await http(
      'GET',
      `/pix/transactions/account/${senderAccountId}/history`,
    );

    expect(res.status).toBe(200);
    expect(res.data.bankAccountId).toBe(senderAccountId);
    expect(res.data.currentBalance).toBeDefined();
    expect(typeof res.data.count).toBe('number');
    expect(Array.isArray(res.data.transactions)).toBe(true);
  });

  it('12b. remetente vê transações como SENT e o crédito como RECEIVED', async () => {
    const res = await http(
      'GET',
      `/pix/transactions/account/${senderAccountId}/history`,
    );

    expect(res.status).toBe(200);

    const direcoes = res.data.transactions.map((t: any) => t.direction);
    expect(direcoes).toContain('SENT');
    expect(direcoes).toContain('RECEIVED');
  });

  it('12c. recebedor vê a MESMA transação como RECEIVED', async () => {
    const res = await http(
      'GET',
      `/pix/transactions/account/${receivers[0].accountId}/history`,
    );

    expect(res.status).toBe(200);
    expect(res.data.count).toBeGreaterThanOrEqual(1);

    const t = res.data.transactions[0];
    expect(t.direction).toBe('RECEIVED');
    expect(t.counterpartAccountId).toBe(senderAccountId);
  });
});