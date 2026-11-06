/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BankAccountService } from './bank-account.service';

describe('BankAccountService (Daily Limit)', () => {
  let service: BankAccountService;
  let dbMock: any;
  let selectQueue: any[][];
  let updateResultQueue: any[][];

  function enqueueSelect(...results: any[][]) {
    selectQueue.push(...results);
  }

  function enqueueUpdate(...results: any[][]) {
    updateResultQueue.push(...results);
  }

  beforeEach(async () => {
    selectQueue = [];
    updateResultQueue = [];

    dbMock = {
      select: jest.fn(() => {
        const result = selectQueue.shift() ?? [];
        const chain: any = {
          from: jest.fn(() => chain),
          where: jest.fn(() => Promise.resolve(result)),
        };
        return chain;
      }),
      update: jest.fn(() => {
        const result = updateResultQueue.shift() ?? [];
        const chain: any = {
          set: jest.fn(() => chain),
          where: jest.fn(() => chain),
          returning: jest.fn(() => Promise.resolve(result)),
        };
        return chain;
      }),
      insert: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BankAccountService, { provide: 'DRIZZLE', useValue: dbMock }],
    }).compile();

    service = module.get<BankAccountService>(BankAccountService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve consultar o limite diário de uma conta existente', async () => {
    const account = {
      id: 'acc-1',
      userId: 'user-1',
      balance: '1000.00',
      dailyLimit: '5000.00',
      status: 'ACTIVE',
    };
    enqueueSelect([account]);

    const result = await service.getDailyLimit('acc-1');

    expect(result).toEqual({
      bankAccountId: 'acc-1',
      dailyLimit: '5000.00',
    });
  });

  it('deve lançar NotFoundException ao consultar limite diário de conta inexistente', async () => {
    enqueueSelect([]);

    await expect(service.getDailyLimit('acc-inexistente')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deve atualizar o limite diário de transações com sucesso', async () => {
    const account = {
      id: 'acc-1',
      userId: 'user-1',
      balance: '1000.00',
      dailyLimit: '10000.00',
      status: 'ACTIVE',
    };
    const updatedAccount = {
      ...account,
      dailyLimit: '2500.00',
    };

    enqueueSelect([account]);
    enqueueUpdate([updatedAccount]);

    const result = await service.updateDailyLimit('acc-1', 2500);

    expect(result.dailyLimit).toBe('2500.00');
    expect(dbMock.update).toHaveBeenCalledTimes(1);
  });

  it('deve rejeitar limite diário negativo com BadRequestException', async () => {
    await expect(service.updateDailyLimit('acc-1', -100)).rejects.toThrow(
      BadRequestException,
    );
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  it('deve permitir atualizar dailyLimit via método update genérico', async () => {
    const account = {
      id: 'acc-1',
      userId: 'user-1',
      balance: '1000.00',
      dailyLimit: '10000.00',
      status: 'ACTIVE',
    };
    const updatedAccount = {
      ...account,
      dailyLimit: '3000.00',
    };

    enqueueSelect([account]);
    enqueueUpdate([updatedAccount]);

    const result = await service.update('acc-1', { dailyLimit: 3000 });

    expect(result.dailyLimit).toBe('3000.00');
  });
});
