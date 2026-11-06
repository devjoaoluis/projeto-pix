import { Test, TestingModule } from '@nestjs/testing';
import { BankAccountController } from './bank-account.controller';
import { BankAccountService } from './bank-account.service';

describe('BankAccountController (Daily Limit)', () => {
  let controller: BankAccountController;
  let service: jest.Mocked<Partial<BankAccountService>>;

  beforeEach(async () => {
    service = {
      getDailyLimit: jest.fn(),
      updateDailyLimit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankAccountController],
      providers: [{ provide: BankAccountService, useValue: service }],
    }).compile();

    controller = module.get<BankAccountController>(BankAccountController);
  });

  it('deve retornar o limite diário da conta via GET :id/daily-limit', async () => {
    const expected = { bankAccountId: 'acc-1', dailyLimit: '5000.00' };
    (service.getDailyLimit as jest.Mock).mockResolvedValue(expected);

    const result = await controller.getDailyLimit('acc-1');

    expect(service.getDailyLimit).toHaveBeenCalledWith('acc-1');
    expect(result).toEqual(expected);
  });

  it('deve atualizar o limite diário da conta via PATCH :id/daily-limit', async () => {
    const updated = { id: 'acc-1', dailyLimit: '3500.00' };
    (service.updateDailyLimit as jest.Mock).mockResolvedValue(updated);

    const result = await controller.updateDailyLimit('acc-1', {
      dailyLimit: 3500,
    });

    expect(service.updateDailyLimit).toHaveBeenCalledWith('acc-1', 3500);
    expect(result).toEqual(updated);
  });
});
