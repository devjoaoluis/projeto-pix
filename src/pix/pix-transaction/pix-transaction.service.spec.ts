import { Test, TestingModule } from '@nestjs/testing';
import { PixTransactionService } from './pix-transaction.service';
import { NotificationService } from '../../notification/notification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FraudDetectionService } from '../fraud/fraud-detection.service';

describe('PixTransactionService (BDD Scenarios)', () => {
  let service: PixTransactionService;
  let dbMock: any;
  let notificationServiceMock: any;
  let fraudDetectionMock: any;

  /**
   * Fila de resultados de queries. Cada `select()` consome o próximo
   * item da fila. É resetada a cada teste.
   *
   * Uso: enqueue([resultado1, resultado2]) antes de chamar o método
   * que faz as queries na ordem esperada.
   */
  let selectQueue: any[][];

  function enqueue(...results: any[][]) {
    selectQueue.push(...results);
  }

  /**
   * Configura o dbMock para lidar com as duas cadeias usadas no código:
   *   - db.select().from(t).where(cond)              → [rows]
   *   - db.select().from(t).where(cond).orderBy(col) → [rows]
   *
   * O truque é o `where` retornar um objeto que:
   *   - é "thenable" (tem .then) para o caso sem orderBy
   *   - tem .orderBy para o caso com orderBy
   */
  function setupDbMock() {
    dbMock = {
      select: jest.fn(() => {
        const result = selectQueue.shift() ?? [];
        const chain: any = {
          from: jest.fn(() => chain),
          where: jest.fn(() => chain),
          orderBy: jest.fn(() => chain),
          limit: jest.fn(() => chain),
          offset: jest.fn(() => Promise.resolve(result)),
          then: (onFulfilled: any, onRejected: any) =>
            Promise.resolve(result).then(onFulfilled, onRejected),
        };
        return chain;
      }),
      transaction: jest.fn(),
    };
  }

  beforeEach(async () => {
    selectQueue = [];
    setupDbMock();

    notificationServiceMock = {
      notify: jest.fn(),
    };

    fraudDetectionMock = {
      evaluateTransfer: jest.fn().mockResolvedValue({
        score: 0,
        triggeredRules: [],
        blocked: false,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PixTransactionService,
        { provide: 'DRIZZLE', useValue: dbMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: FraudDetectionService, useValue: fraudDetectionMock },
      ],
    }).compile();

    service = module.get<PixTransactionService>(PixTransactionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================================
  // Cenário 1 — Transferência Pix realizada com sucesso
  // =====================================================================
  it('Cenário 1: Transferência Pix realizada com sucesso', async () => {
    const senderAccount = { id: 'acc-A', balance: '200.00', status: 'ACTIVE' };
    const pixKey = { id: 'key-1', bankAccountId: 'acc-B', key: 'chave-b' };
    const receiverAccount = { id: 'acc-B', balance: '50.00', status: 'ACTIVE' };
    const insertedTx = { id: 'tx-123' };

    // 3 queries de select: sender, pixKey, receiver
    enqueue([senderAccount], [pixKey], [receiverAccount]);

    const mockTx = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      // 1ª chamada: débito condicional; 2ª: insert da transação
      returning: jest.fn()
        .mockResolvedValueOnce([{ id: 'acc-A' }])
        .mockResolvedValueOnce([insertedTx]),
    };
    dbMock.transaction.mockImplementation(async (cb: any) => cb(mockTx));

    notificationServiceMock.notify.mockReturnValue({});

    const result = await service.transfer('acc-A', {
      pixKey: 'chave-b',
      amount: 100,
      description: 'Pagamento',
    });

    expect(result.transaction).toEqual(insertedTx);
    expect(notificationServiceMock.notify).toHaveBeenCalledTimes(2);
    expect(notificationServiceMock.notify).toHaveBeenNthCalledWith(
      1,
      'acc-A',
      'tx-123',
      'TRANSFER',
      100,
      'Pagamento',
    );
    expect(notificationServiceMock.notify).toHaveBeenNthCalledWith(
      2,
      'acc-B',
      'tx-123',
      'RECEIVE',
      100,
      'Pagamento',
    );
  });

  // =====================================================================
  // Cenário 2 — Recebimento de Pix via Webhook
  // =====================================================================
  it('Cenário 2: Recebimento de Pix via Webhook', async () => {
    const pixKey = { id: 'key-1', bankAccountId: 'acc-C', key: 'chave-c' };
    const insertedTx = { id: 'tx-456' };

    // 1ª select: resolvePixKey → [pixKey]
    // 2ª select: findByExternalId → [] (nenhuma duplicada)
    enqueue([pixKey], []);

    const mockTx = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([insertedTx]),
    };
    dbMock.transaction.mockImplementation(async (cb: any) => cb(mockTx));

    notificationServiceMock.notify.mockReturnValue({});

    const result = await service.receiveWebhook({
      pixKey: 'chave-c',
      amount: 50,
      externalTransactionId: 'ext-789',
      description: 'Recebimento externo',
    });

    expect((result as any).transaction).toEqual(insertedTx);
    expect(notificationServiceMock.notify).toHaveBeenCalledTimes(1);
    expect(notificationServiceMock.notify).toHaveBeenCalledWith(
      'acc-C',
      'tx-456',
      'RECEIVE',
      50,
      'Recebimento externo',
    );
  });

  // =====================================================================
  // Cenário 3 — Tentativa de transferência para a própria conta
  // =====================================================================
  it('Cenário 3: Tentativa de transferência para a própria conta', async () => {
    const senderAccount = { id: 'acc-A', balance: '200.00', status: 'ACTIVE' };
    const pixKey = { id: 'key-1', bankAccountId: 'acc-A', key: 'chave-a' };

    // sender, pixKey, receiver (é a mesma conta)
    enqueue([senderAccount], [pixKey], [senderAccount]);

    await expect(
      service.transfer('acc-A', { pixKey: 'chave-a', amount: 50 }),
    ).rejects.toThrow(BadRequestException);

    expect(dbMock.transaction).not.toHaveBeenCalled();
    expect(notificationServiceMock.notify).not.toHaveBeenCalled();
  });

  // =====================================================================
  // Cenário 4 — Tentativa de transferência com saldo insuficiente
  // =====================================================================
  it('Cenário 4: Tentativa de transferência com saldo insuficiente', async () => {
    const senderAccount = { id: 'acc-A', balance: '20.00', status: 'ACTIVE' };
    const pixKey = { id: 'key-1', bankAccountId: 'acc-B', key: 'chave-b' };
    const receiverAccount = { id: 'acc-B', balance: '50.00', status: 'ACTIVE' };

    enqueue([senderAccount], [pixKey], [receiverAccount]);

    // O saldo é conferido pelo débito condicional: nenhuma linha afetada = saldo insuficiente
    const mockTx = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValueOnce([]),
      insert: jest.fn(),
    };
    dbMock.transaction.mockImplementation(async (cb) => cb(mockTx));

    await expect(
      service.transfer('acc-A', { pixKey: 'chave-b', amount: 50 })
    ).rejects.toThrow('Saldo insuficiente');

    expect(mockTx.insert).not.toHaveBeenCalled();
    expect(notificationServiceMock.notify).not.toHaveBeenCalled();
  });

  // =====================================================================
  // Cenário 5 — Webhook duplicado (Idempotência)
  // =====================================================================
  it('Cenário 5: Webhook de transação duplicada (Idempotência)', async () => {
    const pixKey = { id: 'key-1', bankAccountId: 'acc-C', key: 'chave-c' };
    const existingTx = { id: 'tx-existing' };

    // 1ª select: resolvePixKey → [pixKey]
    // 2ª select: findByExternalId → [existingTx]
    enqueue([pixKey], [existingTx]);

    const result = await service.receiveWebhook({
      pixKey: 'chave-c',
      amount: 50,
      externalTransactionId: 'ext-123',
    });

    expect(result).toEqual(existingTx);
    expect(dbMock.transaction).not.toHaveBeenCalled();
    expect(notificationServiceMock.notify).not.toHaveBeenCalled();
  });

  // =====================================================================
  // Cenário 6 — Filtrar transações por intervalo de datas válido
  // =====================================================================
  it('Cenário 6: Filtrar transações informando um intervalo de datas válido', async () => {
    const mockTx = [{ id: 'tx-1', createdAt: new Date('2026-01-05T10:00:00Z') }];

    enqueue(mockTx);

    const result = await service.getTransactionsByAccountAndDate('acc-A', {
      startDate: '2026-01-02T00:00:00Z',
      endDate: '2026-01-08T23:59:59Z',
    });

    expect(result).toEqual(mockTx);
    expect(dbMock.select).toHaveBeenCalled();
  });

  // =====================================================================
  // Cenário 7 — Filtrar transações apenas pela data de início
  // =====================================================================
  it('Cenário 7: Filtrar transações apenas pela data de início (startDate)', async () => {
    const mockTxs = [
      { id: 'tx-1', createdAt: new Date('2026-01-05T10:00:00Z') },
      { id: 'tx-2', createdAt: new Date('2026-01-10T10:00:00Z') },
    ];

    enqueue(mockTxs);

    const result = await service.getTransactionsByAccountAndDate('acc-A', {
      startDate: '2026-01-05T00:00:00Z',
    });

    expect(result).toEqual(mockTxs);
    expect(dbMock.select).toHaveBeenCalled();
  });

  // =====================================================================
  // Cenário 8 — endDate anterior ao startDate
  // =====================================================================
  it('Cenário 8: Tentar filtrar transações informando endDate anterior ao startDate', async () => {
    await expect(
      service.getTransactionsByAccountAndDate('acc-A', {
        startDate: '2026-01-10T00:00:00Z',
        endDate: '2026-01-05T23:59:59Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('limite diário', () => {
    const sender = { id: 'acc-A', balance: '500.00', status: 'ACTIVE', dailyLimit: '100.00' };

    it('Cenário 13: Transferência negada quando passa do limite diário', async () => {
      // getSenderAccount -> soma das transferências COMPLETED do dia
      enqueue([sender], [{ total: '80.00' }]);

      await expect(
        service.transfer('acc-A', { pixKey: 'chave-b', amount: 30 }),
      ).rejects.toThrow('Limite diário de transações excedido');

      expect(dbMock.transaction).not.toHaveBeenCalled();
    });

    it('Cenário 14: Transferência que fecha exatamente o limite diário é aceita', async () => {
      enqueue([sender], [{ total: '70.00' }], [{ id: 'key-1', bankAccountId: 'acc-B', key: 'chave-b' }], [{ id: 'acc-B', balance: '0', status: 'ACTIVE' }]);

      const mockTx = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        // 1ª chamada: débito condicional; 2ª: insert da transação
        returning: jest.fn()
          .mockResolvedValueOnce([{ id: 'acc-A' }])
          .mockResolvedValueOnce([{ id: 'tx-9' }]),
      };
      dbMock.transaction.mockImplementation(async (cb) => cb(mockTx));

      const result = await service.transfer('acc-A', { pixKey: 'chave-b', amount: 30 });

      expect(result.transaction).toEqual({ id: 'tx-9' });
    });
  });

  it('Cenário 15: Limite diário não é negado por erro de arredondamento', async () => {
    // 0.1 + 0.2 em float dá 0.30000000000000004, que passaria de 0.30
    enqueue([{ id: 'acc-A', balance: '500.00', status: 'ACTIVE', dailyLimit: '0.30' }], [{ total: '0.10' }], []); // chave não encontrada: prova que passou do limite

    await expect(
      service.transfer('acc-A', { pixKey: 'chave-b', amount: 0.2 }),
    ).rejects.toThrow(NotFoundException);
  });

  describe('cancel (estorno)', () => {
    const completedTx = {
      id: 'tx-1',
      status: 'COMPLETED',
      amount: '100.00',
      senderAccountId: 'acc-A',
      receiverAccountId: 'acc-B',
    };

    const buildTx = (...returns: any[][]) => {
      const mockTx: any = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn(),
      };
      returns.forEach((r) => mockTx.returning.mockResolvedValueOnce(r));
      dbMock.transaction.mockImplementation(async (cb) => cb(mockTx));
      return mockTx;
    };

    it('Cenário 9: Estorno de transação concluída devolve os saldos e notifica', async () => {
      enqueue([completedTx]);
      const canceled = { ...completedTx, status: 'CANCELED' };
      // 1º returning: transação cancelada; 2º: débito do recebedor
      const mockTx = buildTx([canceled], [{ id: 'acc-B' }]);

      const result = await service.cancel('tx-1');

      expect(result.transaction).toEqual(canceled);
      expect(dbMock.transaction).toHaveBeenCalledTimes(1);
      // status + débito do recebedor + crédito do remetente
      expect(mockTx.update).toHaveBeenCalledTimes(3);
      expect(notificationServiceMock.notify).toHaveBeenCalledTimes(2);
      expect(notificationServiceMock.notify).toHaveBeenCalledWith(
        'acc-A', 'tx-1', 'CANCELED', 100, expect.any(String),
      );
    });

    it('Cenário 10: Estorno negado quando o recebedor não tem saldo', async () => {
      enqueue([completedTx]);
      // débito do recebedor não afeta nenhuma linha
      const mockTx = buildTx([{ ...completedTx, status: 'CANCELED' }], []);

      await expect(service.cancel('tx-1')).rejects.toThrow(BadRequestException);

      // lançou dentro do db.transaction (rollback) antes de creditar o remetente
      expect(mockTx.update).toHaveBeenCalledTimes(2);
      expect(notificationServiceMock.notify).not.toHaveBeenCalled();
    });

    it('Cenário 11: Transação já cancelada não é estornada de novo', async () => {
      enqueue([{ ...completedTx, status: 'CANCELED' }]);

      await expect(service.cancel('tx-1')).rejects.toThrow(BadRequestException);

      expect(dbMock.transaction).not.toHaveBeenCalled();
    });

    it('Cenário 16: Transação que falhou (FAILED) não é cancelada', async () => {
      enqueue([{ ...completedTx, status: 'FAILED' }]);

      await expect(service.cancel('tx-1')).rejects.toThrow(
        'Transação que falhou não pode ser cancelada',
      );

      expect(dbMock.transaction).not.toHaveBeenCalled();
      expect(notificationServiceMock.notify).not.toHaveBeenCalled();
    });

    it('Cenário 12: Transação inexistente', async () => {
      enqueue([]);

      await expect(service.cancel('tx-x')).rejects.toThrow(NotFoundException);
    });
  });

  // =====================================================================
  // getHistory
  // =====================================================================
  describe('getHistory', () => {
    it('lança NotFoundException se a conta não existe', async () => {
      enqueue([]); // findById retorna vazio

      await expect(service.getHistory('acc-inexistente', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança BadRequestException se endDate < startDate', async () => {
      await expect(
        service.getHistory('acc-1', {
          startDate: '2026-01-10T00:00:00Z',
          endDate: '2026-01-05T00:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('retorna histórico vazio com saldo', async () => {
      const account = { id: 'acc-1', balance: '100.00' };

      // 1ª select: findById → [account]
      // 2ª select: transações → []
      enqueue([account], []);

      const result = await service.getHistory('acc-1', {});

      expect(result.bankAccountId).toBe('acc-1');
      expect(result.currentBalance).toBe('100.00');
      expect(result.count).toBe(0);
      expect(result.transactions).toEqual([]);
    });

    it('remetente vê a transação como SENT', async () => {
      const account = { id: 'acc-A', balance: '500.00' };
      const tx = {
        id: 'tx-1',
        type: 'TRANSFER',
        status: 'COMPLETED',
        amount: '100.00',
        description: 'Aluguel',
        senderAccountId: 'acc-A',
        receiverAccountId: 'acc-B',
        bankAccountId: null,
        createdAt: new Date('2026-01-05T10:00:00Z'),
      };

      enqueue([account], [tx]);

      const result = await service.getHistory('acc-A', {});

      expect(result.count).toBe(1);
      expect(result.transactions[0].direction).toBe('SENT');
      expect(result.transactions[0].counterpartAccountId).toBe('acc-B');
    });

    it('recebedor vê a MESMA transação como RECEIVED', async () => {
      const account = { id: 'acc-B', balance: '300.00' };
      const tx = {
        id: 'tx-1',
        type: 'TRANSFER',
        status: 'COMPLETED',
        amount: '100.00',
        description: 'Aluguel',
        senderAccountId: 'acc-A',
        receiverAccountId: 'acc-B',
        bankAccountId: null,
        createdAt: new Date('2026-01-05T10:00:00Z'),
      };

      enqueue([account], [tx]);

      const result = await service.getHistory('acc-B', {});

      expect(result.count).toBe(1);
      expect(result.transactions[0].direction).toBe('RECEIVED');
      expect(result.transactions[0].counterpartAccountId).toBe('acc-A');
    });

    it('cobrança PIX aparece como CHARGE para o dono', async () => {
      const account = { id: 'acc-A', balance: '500.00' };
      const tx = {
        id: 'tx-2',
        type: 'PIX_CHARGE',
        status: 'PENDING',
        amount: '200.00',
        description: 'Cobrança',
        senderAccountId: null,
        receiverAccountId: null,
        bankAccountId: 'acc-A',
        createdAt: new Date('2026-01-06T10:00:00Z'),
      };

      enqueue([account], [tx]);

      const result = await service.getHistory('acc-A', {});

      expect(result.transactions[0].direction).toBe('CHARGE');
      expect(result.transactions[0].counterpartAccountId).toBeNull();
    });

    it('mistura de SENT, RECEIVED e CHARGE no mesmo histórico', async () => {
      const account = { id: 'acc-A', balance: '1000.00' };
      const txs = [
        {
          id: 'tx-sent',
          type: 'TRANSFER',
          status: 'COMPLETED',
          amount: '100.00',
          description: null,
          senderAccountId: 'acc-A',
          receiverAccountId: 'acc-B',
          bankAccountId: null,
          createdAt: new Date('2026-01-10T10:00:00Z'),
        },
        {
          id: 'tx-received',
          type: 'TRANSFER',
          status: 'COMPLETED',
          amount: '200.00',
          description: null,
          senderAccountId: 'acc-C',
          receiverAccountId: 'acc-A',
          bankAccountId: null,
          createdAt: new Date('2026-01-09T10:00:00Z'),
        },
        {
          id: 'tx-charge',
          type: 'PIX_CHARGE',
          status: 'PAID',
          amount: '300.00',
          description: null,
          senderAccountId: null,
          receiverAccountId: null,
          bankAccountId: 'acc-A',
          createdAt: new Date('2026-01-08T10:00:00Z'),
        },
      ];

      enqueue([account], txs);

      const result = await service.getHistory('acc-A', {});

      expect(result.count).toBe(3);
      expect(result.transactions.find((t) => t.id === 'tx-sent')?.direction).toBe(
        'SENT',
      );
      expect(
        result.transactions.find((t) => t.id === 'tx-received')?.direction,
      ).toBe('RECEIVED');
      expect(
        result.transactions.find((t) => t.id === 'tx-charge')?.direction,
      ).toBe('CHARGE');
    });

    it('aplica filtro de data quando informado', async () => {
      const account = { id: 'acc-A', balance: '500.00' };

      enqueue([account], []);

      const result = await service.getHistory('acc-A', {
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
      });

      expect(result.count).toBe(0);
      expect(dbMock.select).toHaveBeenCalled();
    });
  });
});
