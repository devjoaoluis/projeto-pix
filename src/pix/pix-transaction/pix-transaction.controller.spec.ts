import { Test, TestingModule } from '@nestjs/testing';
import { PixTransactionController } from './pix-transaction.controller';
import { PixTransactionService } from './pix-transaction.service';

describe('PixTransactionController', () => {
  let controller: PixTransactionController;
  let mockPixTransactionService: jest.Mocked<Partial<PixTransactionService>>;

  beforeEach(async () => {
    mockPixTransactionService = {
      getTransactionsByAccountAndDate: jest.fn(),
      transfer: jest.fn(),
      receiveWebhook: jest.fn(),
      refund: jest.fn(),
      cancel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PixTransactionController],
      providers: [
        {
          provide: PixTransactionService,
          useValue: mockPixTransactionService,
        },
      ],
    }).compile();

    controller = module.get<PixTransactionController>(PixTransactionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call refund via PATCH :id/refund', async () => {
    const expected = {
      message: 'Estorno de transação realizado com sucesso',
      refundAmount: 100,
    };
    (mockPixTransactionService.refund as jest.Mock).mockResolvedValue(expected);

    const result = await controller.refund('tx-1', {
      reason: 'Transação indevida',
    });

    expect(mockPixTransactionService.refund).toHaveBeenCalledWith('tx-1', {
      reason: 'Transação indevida',
    });
    expect(result).toEqual(expected);
  });
});
