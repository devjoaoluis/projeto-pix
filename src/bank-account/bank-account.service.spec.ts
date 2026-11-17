import { NotFoundException } from '@nestjs/common';
import { BankAccountService } from './bank-account.service';

describe('BankAccountService.updateDailyLimit', () => {
  let db: any;
  let service: BankAccountService;

  beforeEach(() => {
    db = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn(),
      returning: jest.fn(),
    };
    service = new BankAccountService(db);
  });

  it('grava o limite diário da conta', async () => {
    db.where
      .mockResolvedValueOnce([{ id: 'acc-A' }]) // findById
      .mockReturnValueOnce(db); // update ... where
    db.returning.mockResolvedValueOnce([{ id: 'acc-A', dailyLimit: '150.50' }]);

    const result = await service.updateDailyLimit('acc-A', 150.5);

    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({ dailyLimit: '150.50' }),
    );
    expect(result.dailyLimit).toBe('150.50');
  });

  it('rejeita conta inexistente', async () => {
    db.where.mockResolvedValueOnce([]);

    await expect(service.updateDailyLimit('acc-x', 100)).rejects.toThrow(
      NotFoundException,
    );
    expect(db.update).not.toHaveBeenCalled();
  });
});
