import { Test, TestingModule } from '@nestjs/testing';
import { PixTransactionController } from './pix-transaction.controller';
import { PixTransactionService } from './pix-transaction.service';

describe('PixTransactionController', () => {
  let controller: PixTransactionController;

  beforeEach(async () => {
    const mockPixTransactionService = {
      getTransactionsByAccountAndDate: jest.fn(),
      transfer: jest.fn(),
      receiveWebhook: jest.fn(),
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
});
