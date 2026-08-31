import { Test, TestingModule } from '@nestjs/testing';
import { PixTransactionController } from './pix-transaction.controller';

describe('PixTransactionController', () => {
  let controller: PixTransactionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PixTransactionController],
    }).compile();

    controller = module.get<PixTransactionController>(PixTransactionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
