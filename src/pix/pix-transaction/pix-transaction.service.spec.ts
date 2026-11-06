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
  let insertQueue: any[][];

  function enqueue(...results: any[][]) {
    selectQueue.push(...results);
  }

  function enqueueInsert(...results: any[][]) {
    insertQueue.push(...results);
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
      insert: jest.fn(() => {
        const result = insertQueue.shift() ?? [];
        const chain: any = {
          values: jest.fn(() => chain),
          returning: jest.fn(() => Promise.resolve(result)),
        };
        return chain;
      }),
      transaction: jest.fn(),
    };
  }

  beforeEach(async () => {
    selectQueue = [];
    insertQueue = [];
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

  // =====================================================================
  // Realizar Pix Agendado (Scheduled Pix)
  // =====================================================================
  describe('Realizar Pix Agendado (scheduleTransfer & executeScheduled)', () => {
    it('deve agendar uma transferência PIX para uma data futura com status SCHEDULED', async () => {
      const senderAccount = {
        id: 'acc-A',
        balance: '100.00',
        status: 'ACTIVE',
      };
      const pixKey = { id: 'key-1', bankAccountId: 'acc-B', key: 'chave-b' };
      const receiverAccount = {
        id: 'acc-B',
        balance: '50.00',
        status: 'ACTIVE',
      };
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const scheduledTx = {
        id: 'tx-sched-1',
        senderAccountId: 'acc-A',
        receiverAccountId: 'acc-B',
        amount: '250.00',
        status: 'SCHEDULED',
        scheduledFor: new Date(futureDate),
      };

      enqueue([senderAccount], [pixKey], [receiverAccount]);
      enqueueInsert([scheduledTx]);

      const result = await service.scheduleTransfer('acc-A', {
        pixKey: 'chave-b',
        amount: 250,
        scheduledFor: futureDate,
        description: 'Aluguel próximo mês',
      });

      expect(result.message).toBe('Transferência PIX agendada com sucesso');
      expect(result.transaction).toEqual(scheduledTx);
    });

    it('deve rejeitar agendamento de PIX com data no passado', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();

      await expect(
        service.scheduleTransfer('acc-A', {
          pixKey: 'chave-b',
          amount: 100,
          scheduledFor: pastDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve executar um PIX agendado debitando do remetente, creditando ao destinatário e enviando notificações', async () => {
      const scheduledTx = {
        id: 'tx-sched-1',
        senderAccountId: 'acc-A',
        receiverAccountId: 'acc-B',
        amount: '150.00',
        status: 'SCHEDULED',
        description: 'Parcela agendada',
      };
      const senderAccount = {
        id: 'acc-A',
        balance: '500.00',
        status: 'ACTIVE',
      };
      const receiverAccount = {
        id: 'acc-B',
        balance: '100.00',
        status: 'ACTIVE',
      };
      const completedTx = {
        ...scheduledTx,
        status: 'COMPLETED',
      };

      enqueue([scheduledTx], [senderAccount], [receiverAccount]);

      const mockTx = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([completedTx]),
      };
      dbMock.transaction.mockImplementation(async (cb: any) => cb(mockTx));

      const result = await service.executeScheduled('tx-sched-1');

      expect(result.message).toBe('PIX agendado executado com sucesso');
      expect(result.transaction.status).toBe('COMPLETED');
      expect(notificationServiceMock.notify).toHaveBeenCalledTimes(2);
    });

    it('deve listar todas as transações PIX agendadas de uma conta', async () => {
      const list = [{ id: 'tx-sched-1', status: 'SCHEDULED' }];
      enqueue(list);

      const result = await service.getScheduledByAccount('acc-A');

      expect(result).toEqual(list);
    });
  });

  describe('getHistory', () => {
    it('lança NotFoundException se a conta não existe', async () => {
      enqueue([]);

      await expect(service.getHistory('acc-inexistente', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
