/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
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

  let selectQueue: any[][];

  function enqueue(...results: any[][]) {
    selectQueue.push(...results);
  }

  function setupDbMock() {
    dbMock = {
      select: jest.fn(() => {
        const result = selectQueue.shift() ?? [];
        const chain: any = {
          from: jest.fn(() => chain),
          where: jest.fn(() => chain),
          orderBy: jest.fn(() => Promise.resolve(result)),
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

  it('Cenário 1: Transferência Pix realizada com sucesso', async () => {
    const senderAccount = { id: 'acc-A', balance: '200.00', status: 'ACTIVE' };
    const pixKey = { id: 'key-1', bankAccountId: 'acc-B', key: 'chave-b' };
    const receiverAccount = { id: 'acc-B', balance: '50.00', status: 'ACTIVE' };
    const insertedTx = { id: 'tx-123' };

    enqueue([senderAccount], [pixKey], [receiverAccount]);

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

    const result = await service.transfer('acc-A', {
      pixKey: 'chave-b',
      amount: 100,
      description: 'Pagamento',
    });

    expect(result.transaction).toEqual(insertedTx);
    expect(notificationServiceMock.notify).toHaveBeenCalledTimes(2);
  });

  it('Cenário 2: Recebimento de Pix via Webhook', async () => {
    const pixKey = { id: 'key-1', bankAccountId: 'acc-C', key: 'chave-c' };
    const insertedTx = { id: 'tx-456' };

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
  });

  it('Cenário 3: Tentativa de transferência para a própria conta', async () => {
    const senderAccount = { id: 'acc-A', balance: '200.00', status: 'ACTIVE' };
    const pixKey = { id: 'key-1', bankAccountId: 'acc-A', key: 'chave-a' };

    enqueue([senderAccount], [pixKey], [senderAccount]);

    await expect(
      service.transfer('acc-A', { pixKey: 'chave-a', amount: 50 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('Cenário 4: Tentativa de transferência com saldo insuficiente', async () => {
    const senderAccount = { id: 'acc-A', balance: '20.00', status: 'ACTIVE' };

    enqueue([senderAccount]);

    await expect(
      service.transfer('acc-A', { pixKey: 'chave-b', amount: 50 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('Cenário 5: Webhook de transação duplicada (Idempotência)', async () => {
    const pixKey = { id: 'key-1', bankAccountId: 'acc-C', key: 'chave-c' };
    const existingTx = { id: 'tx-existing' };

    enqueue([pixKey], [existingTx]);

    const result = await service.receiveWebhook({
      pixKey: 'chave-c',
      amount: 50,
      externalTransactionId: 'ext-123',
    });

    expect(result).toEqual(existingTx);
  });

  it('Cenário 6: Filtrar transações informando um intervalo de datas válido', async () => {
    const mockTx = [
      { id: 'tx-1', createdAt: new Date('2026-01-05T10:00:00Z') },
    ];

    enqueue(mockTx);

    const result = await service.getTransactionsByAccountAndDate('acc-A', {
      startDate: '2026-01-02T00:00:00Z',
      endDate: '2026-01-08T23:59:59Z',
    });

    expect(result).toEqual(mockTx);
  });

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
  });

  it('Cenário 8: Tentar filtrar transações informando endDate anterior ao startDate', async () => {
    await expect(
      service.getTransactionsByAccountAndDate('acc-A', {
        startDate: '2026-01-10T00:00:00Z',
        endDate: '2026-01-05T23:59:59Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // =====================================================================
  // Estorno de Valores de Transações Indevidas (Refund)
  // =====================================================================
  describe('Estorno de Transações Indevidas (refund)', () => {
    it('deve realizar o estorno integral de uma transação concluída e devolver saldo ao remetente', async () => {
      const completedTx = {
        id: 'tx-100',
        senderAccountId: 'acc-A',
        receiverAccountId: 'acc-B',
        amount: '150.00',
        status: 'COMPLETED',
        description: 'Transferência por engano',
      };
      const receiverAccount = {
        id: 'acc-B',
        balance: '300.00',
        status: 'ACTIVE',
      };
      const refundedTx = {
        ...completedTx,
        status: 'REFUNDED',
        description: 'Transação duplicada ou indevida',
      };

      enqueue([completedTx], [receiverAccount]);

      const mockTx = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([refundedTx]),
      };
      dbMock.transaction.mockImplementation(async (cb: any) => cb(mockTx));

      const result = await service.refund('tx-100', {
        reason: 'Transação duplicada ou indevida',
      });

      expect(result.message).toBe('Estorno de transação realizado com sucesso');
      expect(result.refundAmount).toBe(150);
      expect(result.transaction.status).toBe('REFUNDED');
      expect(notificationServiceMock.notify).toHaveBeenCalledTimes(2);
    });

    it('deve lançar NotFoundException ao tentar estornar transação inexistente', async () => {
      enqueue([]);

      await expect(service.refund('tx-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException se a transação já foi estornada', async () => {
      enqueue([{ id: 'tx-100', status: 'REFUNDED', amount: '100.00' }]);

      await expect(service.refund('tx-100')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException se a transação não estiver COMPLETED', async () => {
      enqueue([{ id: 'tx-100', status: 'PENDING', amount: '100.00' }]);

      await expect(service.refund('tx-100')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException se a conta recebedora não tiver saldo para o estorno', async () => {
      const completedTx = {
        id: 'tx-100',
        senderAccountId: 'acc-A',
        receiverAccountId: 'acc-B',
        amount: '200.00',
        status: 'COMPLETED',
      };
      const receiverAccount = {
        id: 'acc-B',
        balance: '50.00',
        status: 'ACTIVE',
      };

      enqueue([completedTx], [receiverAccount]);

      await expect(service.refund('tx-100')).rejects.toThrow(
        BadRequestException,
      );
      expect(dbMock.transaction).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // getHistory
  // =====================================================================
  describe('getHistory', () => {
    it('lança NotFoundException se a conta não existe', async () => {
      enqueue([]);

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
      enqueue([account], []);

      const result = await service.getHistory('acc-1', {});

      expect(result.bankAccountId).toBe('acc-1');
      expect(result.currentBalance).toBe('100.00');
      expect(result.count).toBe(0);
    });
  });
});
