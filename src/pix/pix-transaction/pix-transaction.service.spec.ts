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
  let updateQueue: any[][];

  function enqueue(...results: any[][]) {
    selectQueue.push(...results);
  }

  function enqueueUpdate(...results: any[][]) {
    updateQueue.push(...results);
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
      update: jest.fn(() => {
        const result = updateQueue.shift() ?? [];
        const chain: any = {
          set: jest.fn(() => chain),
          where: jest.fn(() => chain),
          returning: jest.fn(() => Promise.resolve(result)),
        };
        return chain;
      }),
      transaction: jest.fn(),
    };
  }

  beforeEach(async () => {
    selectQueue = [];
    updateQueue = [];
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
  });

  // =====================================================================
  // Registrar Localização de Transações PIX
  // =====================================================================
  describe('Registrar Localização de Transações PIX', () => {
    it('deve registrar localização de uma transação existente', async () => {
      const existingTx = {
        id: 'tx-100',
        amount: '150.00',
        status: 'COMPLETED',
      };
      const updatedTx = {
        ...existingTx,
        latitude: '-23.5505200',
        longitude: '-46.6333080',
        locationName: 'Av. Paulista, 1000',
        city: 'São Paulo',
        state: 'SP',
      };

      enqueue([existingTx]);
      enqueueUpdate([updatedTx]);

      const result = await service.registerLocation('tx-100', {
        latitude: -23.55052,
        longitude: -46.633308,
        locationName: 'Av. Paulista, 1000',
        city: 'São Paulo',
        state: 'SP',
      });

      expect(result.message).toBe(
        'Localização da transação PIX registrada com sucesso',
      );
      expect(result.transaction).toEqual(updatedTx);
    });

    it('deve consultar a localização de uma transação', async () => {
      const existingTx = {
        id: 'tx-100',
        latitude: '-23.5505200',
        longitude: '-46.6333080',
        locationName: 'Av. Paulista',
        city: 'São Paulo',
        state: 'SP',
      };

      enqueue([existingTx]);

      const result = await service.getTransactionLocation('tx-100');

      expect(result).toEqual({
        transactionId: 'tx-100',
        latitude: '-23.5505200',
        longitude: '-46.6333080',
        locationName: 'Av. Paulista',
        city: 'São Paulo',
        state: 'SP',
      });
    });

    it('deve rejeitar coordenadas fora do intervalo permitido', async () => {
      await expect(
        service.registerLocation('tx-100', {
          latitude: 120,
          longitude: -46,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException ao registrar localização em transação inexistente', async () => {
      enqueue([]);

      await expect(
        service.registerLocation('tx-inexistente', {
          city: 'São Paulo',
        }),
      ).rejects.toThrow(NotFoundException);
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
