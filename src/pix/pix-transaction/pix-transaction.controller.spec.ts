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
      registerLocation: jest.fn(),
      getTransactionLocation: jest.fn(),
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

  it('should register transaction location via PATCH :id/location', async () => {
    const expected = {
      message: 'Localização da transação PIX registrada com sucesso',
      transaction: { id: 'tx-1', city: 'São Paulo' },
    };
    (mockPixTransactionService.registerLocation as jest.Mock).mockResolvedValue(
      expected,
    );

    const result = await controller.registerLocation('tx-1', {
      city: 'São Paulo',
    });

    expect(mockPixTransactionService.registerLocation).toHaveBeenCalledWith(
      'tx-1',
      { city: 'São Paulo' },
    );
    expect(result).toEqual(expected);
  });

  it('should get transaction location via GET :id/location', async () => {
    const expected = {
      transactionId: 'tx-1',
      latitude: '-23.5505200',
      longitude: '-46.6333080',
      locationName: 'Centro',
      city: 'São Paulo',
      state: 'SP',
    };
    (
      mockPixTransactionService.getTransactionLocation as jest.Mock
    ).mockResolvedValue(expected);

    const result = await controller.getTransactionLocation('tx-1');

    expect(
      mockPixTransactionService.getTransactionLocation,
    ).toHaveBeenCalledWith('tx-1');
    expect(result).toEqual(expected);
  });
});
