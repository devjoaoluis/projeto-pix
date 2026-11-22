import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [NotificationService],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get and update notification preferences for SMS and Email', () => {
    const defaultPrefs = controller.getPreferences('acc-100');
    expect(defaultPrefs.smsEnabled).toBe(false);
    expect(defaultPrefs.emailEnabled).toBe(false);

    const updated = controller.updatePreferences('acc-100', {
      smsEnabled: true,
      emailEnabled: true,
      email: 'teste@email.com',
      phone: '11999999999',
    });

    expect(updated.smsEnabled).toBe(true);
    expect(updated.emailEnabled).toBe(true);
  });

  it('should enable SMS and Email via shortcut endpoints', () => {
    const smsPrefs = controller.enableSms('acc-200', '11977776666');
    expect(smsPrefs.smsEnabled).toBe(true);
    expect(smsPrefs.phone).toBe('11977776666');

    const emailPrefs = controller.enableEmail('acc-200', 'user@email.com');
    expect(emailPrefs.emailEnabled).toBe(true);
    expect(emailPrefs.email).toBe('user@email.com');
  });
});
