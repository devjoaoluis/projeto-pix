const BASE_URL = 'http://localhost:3000';

// ---------- Helpers de output ----------

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function log(titulo) {
  console.log(`\n${colors.cyan}${colors.bold}━━━ ${titulo} ━━━${colors.reset}`);
}

function ok(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function fail(msg) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function info(msg) {
  console.log(`${colors.gray}  ${msg}${colors.reset}`);
}

function warn(msg) {
  console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
}

// ---------- Helpers HTTP ----------

async function http(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

// ---------- Gerador de CPF válido ----------

function gerarCpf() {
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

// ---------- Fluxo principal ----------

async function main() {
  const uniq = Date.now();
  const resultados = { passou: 0, falhou: 0 };

  function assert(condicao, descricao) {
    if (condicao) {
      ok(descricao);
      resultados.passou++;
    } else {
      fail(descricao);
      resultados.falhou++;
    }
  }

  // ============================================================
  // 0. Sanity check
  // ============================================================
  log('0. Sanity check');
  {
    const res = await http('GET', '/');
    assert(res.status === 200, `GET / responde 200 (recebido: ${res.status})`);
    info(`Body: ${JSON.stringify(res.data).slice(0, 80)}`);
  }

  // ============================================================
  // 1. Cria usuário remetente
  // ============================================================
  log('1. Criação do usuário remetente');
  const senderCpf = gerarCpf();
  const senderEmail = `sender-${uniq}@test.com`;
  let senderUserId;

  {
    const res = await http('POST', '/users', {
      name: 'Sender Fraud Test',
      cpf: senderCpf,
      email: senderEmail,
      phone: `+5511${String(uniq).slice(-9)}`,
    });
    assert(res.status === 201, `POST /users (status: ${res.status})`);
    senderUserId = res.data?.id;
    assert(!!senderUserId, `senderUserId = ${senderUserId}`);
    if (!senderUserId) {
      warn('Não foi possível criar o remetente. Abortando.');
      return resumo(resultados);
    }
  }

  // ============================================================
  // 2. Cria conta do remetente
  // ============================================================
  log('2. Criação da conta do remetente');
  let senderAccountId;
  {
    const res = await http('POST', '/bank-accounts', { userId: senderUserId });
    assert(res.status === 201, `POST /bank-accounts (status: ${res.status})`);
    senderAccountId = res.data?.id;
    assert(!!senderAccountId, `senderAccountId = ${senderAccountId}`);
  }

  // ============================================================
  // 3. Cria chave PIX do remetente
  // ============================================================
  log('3. Criação da chave PIX do remetente');
  const senderPixKey = `sender-${uniq}@test.com`;
  {
    const res = await http('POST', `/pix/keys/account/${senderAccountId}`, {
      key: senderPixKey,
    });
    assert(res.status === 201, `POST /pix/keys/account (status: ${res.status})`);
    assert(res.data?.key === senderPixKey, `chave PIX = ${senderPixKey}`);
  }

  // ============================================================
  // 4. Credita saldo do remetente via webhook
  // ============================================================
  log('4. Crédito inicial de saldo via webhook');
  {
    const res = await http('POST', '/pix/transactions/webhook', {
      pixKey: senderPixKey,
      amount: 20000,
      externalTransactionId: `seed-${uniq}`,
      description: 'Crédito inicial de teste',
    });
    assert(res.status === 201, `POST /pix/transactions/webhook (status: ${res.status})`);

    const saldo = await http('GET', `/bank-accounts/${senderAccountId}/balance`);
    const valor = Number(saldo.data?.balance ?? 0);
    assert(valor >= 20000, `Saldo creditado: R$ ${valor.toFixed(2)}`);
  }

  // ============================================================
  // 5. Cria vários destinatários
  // ============================================================
  log('5. Criação de destinatários');
  const receivers = [];
  for (let i = 0; i < 6; i++) {
    const userRes = await http('POST', '/users', {
      name: `Receiver ${i} Fraud Test`,
      cpf: gerarCpf(),
      email: `receiver-${i}-${uniq}@test.com`,
      phone: `+5511${String(uniq + i + 1).slice(-9)}`,
    });
    if (userRes.status !== 201) {
      fail(`Falha ao criar receiver ${i}: ${userRes.status}`);
      continue;
    }
    const accRes = await http('POST', '/bank-accounts', {
      userId: userRes.data.id,
    });
    if (accRes.status !== 201) {
      fail(`Falha ao criar conta do receiver ${i}: ${accRes.status}`);
      continue;
    }
    const keyRes = await http(
      'POST',
      `/pix/keys/account/${accRes.data.id}`,
      { key: `receiver-${i}-${uniq}@test.com` },
    );
    if (keyRes.status !== 201) {
      fail(`Falha ao criar chave do receiver ${i}: ${keyRes.status}`);
      continue;
    }
    receivers.push({
      accountId: accRes.data.id,
      pixKey: keyRes.data.key,
    });
  }
  assert(receivers.length === 6, `${receivers.length} destinatários criados`);

  // ============================================================
  // 6. Testa regra HIGH_AMOUNT — transferência alta
  // ============================================================
  log('6. Regra HIGH_AMOUNT (valor individual alto)');
  {
    const res = await http(
      'POST',
      `/pix/transactions/${senderAccountId}/transfer`,
      {
        pixKey: receivers[0].pixKey,
        amount: 6000,
        description: 'Transferência alta — deve disparar HIGH_AMOUNT',
      },
    );
    assert(res.status === 201, `Transferência executada (status: ${res.status})`);

    const evalRes = res.data?.fraudEvaluation;
    assert(!!evalRes, 'fraudEvaluation presente na resposta');
    if (evalRes) {
      info(`Score: ${evalRes.score}`);
      info(`Regras: ${evalRes.triggeredRules?.join(', ') || '(nenhuma)'}`);
      info(`Bloqueado: ${evalRes.blocked}`);
      assert(
        evalRes.triggeredRules?.includes('HIGH_AMOUNT'),
        'HIGH_AMOUNT disparou',
      );
    }
  }

  // ============================================================
  // 7. Testa regra NEW_PIX_KEY — chave recém-criada
  // ============================================================
  log('7. Regra NEW_PIX_KEY (chave recém-criada)');
  {
    const res = await http(
      'POST',
      `/pix/transactions/${senderAccountId}/transfer`,
      {
        pixKey: receivers[1].pixKey,
        amount: 50,
        description: 'Chave nova — deve disparar NEW_PIX_KEY',
      },
    );
    const evalRes = res.data?.fraudEvaluation;
    if (evalRes) {
      info(`Score: ${evalRes.score}`);
      info(`Regras: ${evalRes.triggeredRules?.join(', ')}`);
      assert(
        evalRes.triggeredRules?.includes('NEW_PIX_KEY'),
        'NEW_PIX_KEY disparou',
      );
    } else {
      fail('fraudEvaluation ausente');
    }
  }

  // ============================================================
  // 8. Dispara múltiplas regras — volume + destinatários
  // ============================================================
  log('8. Regras HIGH_VOLUME + MANY_RECEIVERS');
  {
    let ultimaAvaliacao = null;
    let bloqueada = false;
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

      if (res.status !== 201) {
        info(`Transferência ${i} rejeitada com status ${res.status} (conta já bloqueada?)`);
        bloqueada = true;
        break;
      }

      ultimaAvaliacao = res.data?.fraudEvaluation;
      info(`Transferência ${i}: score=${ultimaAvaliacao?.score} regras=${ultimaAvaliacao?.triggeredRules?.join(',')}`);
    }

    if (ultimaAvaliacao) {
      assert(
        ultimaAvaliacao.triggeredRules?.includes('HIGH_VOLUME_SHORT_WINDOW'),
        'HIGH_VOLUME_SHORT_WINDOW disparou',
      );
      assert(
        ultimaAvaliacao.triggeredRules?.includes('MANY_RECEIVERS'),
        'MANY_RECEIVERS disparou',
      );
    }

    if (bloqueada) {
      ok('Conta foi bloqueada automaticamente durante o fluxo');
    }
  }

  // ============================================================
  // 9. Bloqueio manual por fraude (endpoint dedicado)
  // ============================================================
  log('9. Bloqueio manual por fraude');
  {
    const res = await http(
      'PATCH',
      `/bank-accounts/${senderAccountId}/block-fraud`,
      { reason: 'Teste manual de bloqueio por suspeita de fraude' },
    );

    if (res.status === 200) {
      ok(`Conta bloqueada (status: ${res.status})`);
      assert(res.data?.status === 'BLOCKED', 'status = BLOCKED');
      assert(
        res.data?.blockedReason === 'SUSPECTED_FRAUD',
        'blockedReason = SUSPECTED_FRAUD',
      );
      assert(!!res.data?.blockedAt, 'blockedAt preenchido');
    } else if (res.status === 409) {
      warn('Conta já estava bloqueada por fraude (bloqueio automático)');
      resultados.passou++;
    } else {
      fail(`Status inesperado: ${res.status} — ${JSON.stringify(res.data)}`);
      resultados.falhou++;
    }
  }

  // ============================================================
  // 10. Verificações pós-bloqueio
  // ============================================================
  log('10. Verificações pós-bloqueio');
  {
    // Confere que está BLOCKED
    const acc = await http('GET', `/bank-accounts/${senderAccountId}`);
    assert(acc.data?.status === 'BLOCKED', `GET conta: status = ${acc.data?.status}`);
    assert(
      acc.data?.blockedReason === 'SUSPECTED_FRAUD',
      `GET conta: blockedReason = ${acc.data?.blockedReason}`,
    );

    // Tenta transferir de conta bloqueada
    const tentativa = await http(
      'POST',
      `/pix/transactions/${senderAccountId}/transfer`,
      {
        pixKey: receivers[0].pixKey,
        amount: 100,
        description: 'Deve falhar',
      },
    );
    assert(tentativa.status === 400, `Transferir de conta bloqueada → 400 (recebido: ${tentativa.status})`);
    info(`Mensagem: ${tentativa.data?.message}`);

    // Tenta reativar conta fraud-blocked
    const ativar = await http(
      'PATCH',
      `/bank-accounts/${senderAccountId}/activate`,
    );
    assert(ativar.status === 400, `Reativar conta fraud-blocked → 400 (recebido: ${ativar.status})`);
    info(`Mensagem: ${ativar.data?.message}`);

    // Tenta bloquear de novo → 409
    const bloquearNovamente = await http(
      'PATCH',
      `/bank-accounts/${senderAccountId}/block-fraud`,
      { reason: 'Duplicado' },
    );
    assert(
      bloquearNovamente.status === 409,
      `Bloquear novamente → 409 (recebido: ${bloquearNovamente.status})`,
    );
  }

  // ============================================================
  // 11. Bloqueio MANUAL (não-fraude) e reativação
  // ============================================================
  log('11. Bloqueio MANUAL e reativação');
  {
    // Cria uma conta nova só para esse teste
    const u = await http('POST', '/users', {
      name: 'Manual Block Test',
      cpf: gerarCpf(),
      email: `manual-${uniq}@test.com`,
      phone: `+5511${String(uniq + 100).slice(-9)}`,
    });
    const a = await http('POST', '/bank-accounts', { userId: u.data.id });

    // Bloqueia manualmente
    const blockRes = await http('PATCH', `/bank-accounts/${a.data.id}/block`);
    assert(blockRes.status === 200, `Bloqueio manual → 200 (recebido: ${blockRes.status})`);
    assert(blockRes.data?.blockedReason === 'MANUAL', `blockedReason = ${blockRes.data?.blockedReason}`);

    // Reativa (deve funcionar porque é MANUAL, não fraude)
    const activateRes = await http('PATCH', `/bank-accounts/${a.data.id}/activate`);
    assert(activateRes.status === 200, `Reativação → 200 (recebido: ${activateRes.status})`);
    assert(activateRes.data?.status === 'ACTIVE', `status = ${activateRes.data?.status}`);
    assert(activateRes.data?.blockedReason === null, 'blockedReason limpo');
  }

  // ============================================================
  // 12. Consultas finais
  // ============================================================
  log('12. Consultas finais');
  {
    const contas = await http('GET', '/bank-accounts');
    assert(Array.isArray(contas.data), `GET /bank-accounts (${contas.data?.length} contas)`);

    const txs = await http('GET', '/pix/transactions');
    assert(Array.isArray(txs.data), `GET /pix/transactions (${txs.data?.length} transações)`);

    const notifs = await http('GET', '/notifications');
    assert(Array.isArray(notifs.data), `GET /notifications (${notifs.data?.length} notificações)`);

    const hist = await http(
      'GET',
      `/pix/transactions/account/${senderAccountId}`,
    );
    assert(Array.isArray(hist.data), `GET /pix/transactions/account/:id (${hist.data?.length} transações)`);
  }

  // ============================================================
  // Resumo
  // ============================================================
  resumo(resultados);
}

function resumo(resultados) {
  console.log(`\n${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}Resumo:${colors.reset}`);
  console.log(`  ${colors.green}✓ Passou:${colors.reset} ${resultados.passou}`);
  console.log(`  ${colors.red}✗ Falhou:${colors.reset} ${resultados.falhou}`);
  console.log(`${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  process.exit(resultados.falhou > 0 ? 1 : 0);
}

// ---------- Entrypoint ----------

main().catch((err) => {
  console.error(`\n${colors.red}Erro fatal:${colors.reset}`, err);
  process.exit(1);
});