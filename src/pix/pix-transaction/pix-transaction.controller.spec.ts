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
      scheduleTransfer: jest.fn(),
      getScheduledByAccount: jest.fn(),
      executeScheduled: jest.fn(),
      receiveWebhook: jest.fn(),
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

  it('should schedule a PIX transfer via POST :senderAccountId/schedule', async () => {
    const dto = {
      pixKey: 'maria@email.com',
      amount: 200,
      scheduledFor: '2027-01-15T10:00:00Z',
    };
    const expected = {
      message: 'Transferência PIX agendada com sucesso',
      transaction: { id: 'tx-sched-1', status: 'SCHEDULED' },
    };
    (mockPixTransactionService.scheduleTransfer as jest.Mock).mockResolvedValue(
      expected,
    );

    const result = await controller.scheduleTransfer('acc-A', dto);

    expect(mockPixTransactionService.scheduleTransfer).toHaveBeenCalledWith(
      'acc-A',
      dto,
    );
    expect(result).toEqual(expected);
  });

  it('should execute a scheduled PIX via PATCH :id/execute-scheduled', async () => {
    const expected = {
      message: 'PIX agendado executado com sucesso',
      transaction: { id: 'tx-sched-1', status: 'COMPLETED' },
    };
    (mockPixTransactionService.executeScheduled as jest.Mock).mockResolvedValue(
      expected,
    );

    const result = await controller.executeScheduled('tx-sched-1');

    expect(mockPixTransactionService.executeScheduled).toHaveBeenCalledWith(
      'tx-sched-1',
    );
    expect(result).toEqual(expected);
  });
});
