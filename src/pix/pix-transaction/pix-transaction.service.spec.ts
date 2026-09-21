import { Test, TestingModule } from '@nestjs/testing';
import { PixTransactionService } from './pix-transaction.service';
import { NotificationService } from '../../notification/notification.service';
import { BadRequestException } from '@nestjs/common';

describe('PixTransactionService (BDD Scenarios)', () => {
  let service: PixTransactionService;
  let dbMock: any;
  let notificationServiceMock: any;

  beforeEach(async () => {
    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn(),
      transaction: jest.fn(),
    };

    notificationServiceMock = {
      notify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PixTransactionService,
        {
          provide: 'DRIZZLE',
          useValue: dbMock,
        },
        {
          provide: NotificationService,
          useValue: notificationServiceMock,
        },
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

    // Mock sequence: getSenderAccount -> resolvePixKey -> getReceiverAccount
    dbMock.where
      .mockResolvedValueOnce([senderAccount])
      .mockResolvedValueOnce([pixKey])
      .mockResolvedValueOnce([receiverAccount]);

    const mockTx = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([insertedTx]),
    };
    dbMock.transaction.mockImplementation(async (cb) => cb(mockTx));

    notificationServiceMock.notify.mockReturnValue({});

    const result = await service.transfer('acc-A', {
      pixKey: 'chave-b',
      amount: 100,
      description: 'Pagamento',
    });

    expect(result.transaction).toEqual(insertedTx);
    expect(notificationServiceMock.notify).toHaveBeenCalledTimes(2);
    expect(notificationServiceMock.notify).toHaveBeenNthCalledWith(
      1, 'acc-A', 'tx-123', 'TRANSFER', 100, 'Pagamento'
    );
    expect(notificationServiceMock.notify).toHaveBeenNthCalledWith(
      2, 'acc-B', 'tx-123', 'RECEIVE', 100, 'Pagamento'
    );
  });

  it('Cenário 2: Recebimento de Pix via Webhook', async () => {
    const pixKey = { id: 'key-1', bankAccountId: 'acc-C', key: 'chave-c' };
    const insertedTx = { id: 'tx-456' };

    // Mock sequence: resolvePixKey -> findByExternalId
    dbMock.where
      .mockResolvedValueOnce([pixKey])
      .mockResolvedValueOnce([]); // Empty array means no existing transaction

    const mockTx = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([insertedTx]),
    };
    dbMock.transaction.mockImplementation(async (cb) => cb(mockTx));

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
      'acc-C', 'tx-456', 'RECEIVE', 50, 'Recebimento externo'
    );
  });

  it('Cenário 3: Tentativa de transferência para a própria conta', async () => {
    const senderAccount = { id: 'acc-A', balance: '200.00', status: 'ACTIVE' };
    const pixKey = { id: 'key-1', bankAccountId: 'acc-A', key: 'chave-a' };
    
    // getSenderAccount -> resolvePixKey -> getReceiverAccount
    dbMock.where
      .mockResolvedValueOnce([senderAccount])
      .mockResolvedValueOnce([pixKey])
      .mockResolvedValueOnce([senderAccount]);

    await expect(
      service.transfer('acc-A', { pixKey: 'chave-a', amount: 50 })
    ).rejects.toThrow(BadRequestException);

    expect(dbMock.transaction).not.toHaveBeenCalled();
    expect(notificationServiceMock.notify).not.toHaveBeenCalled();
  });

  it('Cenário 4: Tentativa de transferência com saldo insuficiente', async () => {
    const senderAccount = { id: 'acc-A', balance: '20.00', status: 'ACTIVE' };

    dbMock.where.mockResolvedValueOnce([senderAccount]);

    await expect(
      service.transfer('acc-A', { pixKey: 'chave-b', amount: 50 })
    ).rejects.toThrow(BadRequestException);

    expect(dbMock.transaction).not.toHaveBeenCalled();
    expect(notificationServiceMock.notify).not.toHaveBeenCalled();
  });

  it('Cenário 5: Webhook de transação duplicada (Idempotência)', async () => {
    const pixKey = { id: 'key-1', bankAccountId: 'acc-C', key: 'chave-c' };
    const existingTx = { id: 'tx-existing' };

    // resolvePixKey -> findByExternalId
    dbMock.where
      .mockResolvedValueOnce([pixKey])
      .mockResolvedValueOnce([existingTx]); // Returns existing transaction

    const result = await service.receiveWebhook({
      pixKey: 'chave-c',
      amount: 50,
      externalTransactionId: 'ext-123',
    });

    // It should return the existing transaction directly
    expect(result).toEqual(existingTx);
    expect(dbMock.transaction).not.toHaveBeenCalled();
    expect(notificationServiceMock.notify).not.toHaveBeenCalled();
  });
  it('Cenário 6: Filtrar transações informando um intervalo de datas válido', async () => {
    const mockTx = [{ id: 'tx-1', createdAt: new Date('2026-01-05T10:00:00Z') }];
    
    // Configura o mock do select chain
    const mockOrderBy = jest.fn().mockResolvedValue(mockTx);
    const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
    dbMock.select.mockReturnValue({ from: mockFrom });

    const result = await service.getTransactionsByAccountAndDate('acc-A', {
      startDate: '2026-01-02T00:00:00Z',
      endDate: '2026-01-08T23:59:59Z',
    });

    expect(result).toEqual(mockTx);
    expect(dbMock.select).toHaveBeenCalled();
  });

  it('Cenário 7: Filtrar transações apenas pela data de início (startDate)', async () => {
    const mockTxs = [
      { id: 'tx-1', createdAt: new Date('2026-01-05T10:00:00Z') },
      { id: 'tx-2', createdAt: new Date('2026-01-10T10:00:00Z') }
    ];
    
    const mockOrderBy = jest.fn().mockResolvedValue(mockTxs);
    const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
    dbMock.select.mockReturnValue({ from: mockFrom });

    const result = await service.getTransactionsByAccountAndDate('acc-A', {
      startDate: '2026-01-05T00:00:00Z',
    });

    expect(result).toEqual(mockTxs);
    expect(dbMock.select).toHaveBeenCalled();
  });

  it('Cenário 8: Tentar filtrar transações informando endDate anterior ao startDate', async () => {
    await expect(
      service.getTransactionsByAccountAndDate('acc-A', {
        startDate: '2026-01-10T00:00:00Z',
        endDate: '2026-01-05T23:59:59Z',
      })
    ).rejects.toThrow(BadRequestException);
  });
});
