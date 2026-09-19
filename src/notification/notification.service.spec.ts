import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should notify RECEIVE transaction and store it', () => {
    const result = service.notify(
      'acc-123',
      'tx-abc',
      'RECEIVE',
      100,
      'Transferência PIX',
    );

    expect(result.accountId).toBe('acc-123');
    expect(result.transactionId).toBe('tx-abc');
    expect(result.type).toBe('RECEIVE');
    expect(result.amount).toBe(100);
    expect(result.message).toContain('Você recebeu um PIX de R$ 100,00');

    // Verifica se ficou armazenado
    const all = service.getAll();
    expect(all).toContainEqual(expect.objectContaining({
      transactionId: 'tx-abc',
      type: 'RECEIVE',
    }));
  });

  it('should notify TRANSFER transaction and store it', () => {
    const result = service.notify(
      'acc-456',
      'tx-xyz',
      'TRANSFER',
      50,
      'Compra online',
    );

    expect(result.accountId).toBe('acc-456');
    expect(result.type).toBe('TRANSFER');
    expect(result.message).toContain('PIX de R$ 50,00 enviado com sucesso');
  });

  it('should get notifications by accountId', () => {
    service.notify('acc-1', 'tx-1', 'RECEIVE', 10);
    service.notify('acc-1', 'tx-2', 'TRANSFER', 20);
    service.notify('acc-2', 'tx-3', 'RECEIVE', 30);

    const acc1Notifications = service.getByAccountId('acc-1');
    expect(acc1Notifications).toHaveLength(2);
    expect(acc1Notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ transactionId: 'tx-1' }),
      expect.objectContaining({ transactionId: 'tx-2' }),
    ]));

    const acc2Notifications = service.getByAccountId('acc-2');
    expect(acc2Notifications).toHaveLength(1);
    expect(acc2Notifications[0].transactionId).toBe('tx-3');
  });

  it('should get all notifications', () => {
    service.notify('acc-a', 'tx-a', 'RECEIVE', 1);
    service.notify('acc-b', 'tx-b', 'TRANSFER', 2);
    service.notify('acc-c', 'tx-c', 'RECEIVE', 3);

    const all = service.getAll();
    expect(all).toHaveLength(3);
  });
});
