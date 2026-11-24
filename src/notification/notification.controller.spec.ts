/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: jest.Mocked<Partial<NotificationService>>;

  beforeEach(async () => {
    service = {
      getAll: jest.fn(),
      getByAccountId: jest.fn(),
      getPreferences: jest.fn(),
      updatePreferences: jest.fn(),
      enableChannel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [{ provide: NotificationService, useValue: service }],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get and update notification preferences for SMS and Email', async () => {
    (service.getPreferences as jest.Mock).mockResolvedValue({
      accountId: 'acc-100',
      smsEnabled: false,
      emailEnabled: false,
      updatedAt: new Date().toISOString(),
    });
    (service.updatePreferences as jest.Mock).mockResolvedValue({
      accountId: 'acc-100',
      smsEnabled: true,
      emailEnabled: true,
      email: 'teste@email.com',
      phone: '11999999999',
      updatedAt: new Date().toISOString(),
    });

    const defaultPrefs = await controller.getPreferences('acc-100');
    expect(defaultPrefs.smsEnabled).toBe(false);
    expect(defaultPrefs.emailEnabled).toBe(false);

    const updated = await controller.updatePreferences('acc-100', {
      smsEnabled: true,
      emailEnabled: true,
      email: 'teste@email.com',
      phone: '11999999999',
    });

    expect(updated.smsEnabled).toBe(true);
    expect(updated.emailEnabled).toBe(true);
  });

  it('should enable SMS and Email via shortcut endpoints', async () => {
    (service.enableChannel as jest.Mock)
      .mockResolvedValueOnce({
        accountId: 'acc-200',
        smsEnabled: true,
        emailEnabled: false,
        phone: '11977776666',
        updatedAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        accountId: 'acc-200',
        smsEnabled: true,
        emailEnabled: true,
        email: 'user@email.com',
        updatedAt: new Date().toISOString(),
      });

    const smsPrefs = await controller.enableSms('acc-200', '11977776666');
    expect(smsPrefs.smsEnabled).toBe(true);
    expect(smsPrefs.phone).toBe('11977776666');

    const emailPrefs = await controller.enableEmail(
      'acc-200',
      'user@email.com',
    );
    expect(emailPrefs.emailEnabled).toBe(true);
    expect(emailPrefs.email).toBe('user@email.com');
  });
});
