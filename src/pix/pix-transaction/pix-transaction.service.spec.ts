import { Test, TestingModule } from '@nestjs/testing';
import { PixTransactionService } from './pix-transaction.service';

describe('PixTransactionService', () => {
  let service: PixTransactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PixTransactionService],
    }).compile();

    service = module.get<PixTransactionService>(PixTransactionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
