/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../db/db.provider';
import { notificationPreferences } from '../db/schema';
import { NotificationService } from './notification.service';

describe('NotificationService (PostgreSQL / Drizzle)', () => {
  let service: NotificationService;
  let prefsStore: Map<string, any>;
  let notificationsStore: any[];
  let dbMock: any;

  beforeEach(async () => {
    prefsStore = new Map();
    notificationsStore = [];

    dbMock = {
      select: jest.fn(() => {
        let isPrefsQuery = false;
        const chain: any = {
          from: jest.fn((t) => {
            isPrefsQuery = t === notificationPreferences;
            return chain;
          }),
          where: jest.fn(() => chain),
          orderBy: jest.fn(() => chain),
          limit: jest.fn(() => chain),
          offset: jest.fn(() => Promise.resolve([...notificationsStore])),
          then: (onFulfilled: any, onRejected: any) =>
            Promise.resolve(
              isPrefsQuery && prefsStore.size > 0
                ? [Array.from(prefsStore.values()).at(-1)]
                : [],
            ).then(onFulfilled, onRejected),
        };
        return chain;
      }),
      insert: jest.fn(() => {
        let pendingValues: any = null;
        const chain: any = {
          values: jest.fn((vals) => {
            pendingValues = vals;
            return chain;
          }),
          onConflictDoUpdate: jest.fn(() => chain),
          returning: jest.fn(() => {
            if ('smsEnabled' in pendingValues) {
              const saved = {
                id: 'pref-1',
                ...pendingValues,
                updatedAt: pendingValues.updatedAt ?? new Date(),
              };
              prefsStore.set(pendingValues.accountId, saved);
              return Promise.resolve([saved]);
            }
            const savedNotification = {
              id: `notif-${notificationsStore.length + 1}`,
              ...pendingValues,
              notifiedAt: new Date(),
            };
            notificationsStore.push(savedNotification);
            return Promise.resolve([savedNotification]);
          }),
        };
        return chain;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: DRIZZLE, useValue: dbMock },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should notify RECEIVE transaction and persist it in PostgreSQL', async () => {
    const result = await service.notify(
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
    expect(result.channels).toEqual(['IN_APP']);
    expect(result.message).toContain('Você recebeu um PIX de R$ 100,00');

    const all = await service.getAll();
    expect(all).toContainEqual(
      expect.objectContaining({
        transactionId: 'tx-abc',
        type: 'RECEIVE',
      }),
    );
  });

  it('should notify TRANSFER transaction and persist it', async () => {
    const result = await service.notify(
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

  describe('SMS and Email Notification Preferences', () => {
    it('should return default preferences with SMS and Email disabled', async () => {
      const prefs = await service.getPreferences('acc-new');
      expect(prefs.accountId).toBe('acc-new');
      expect(prefs.smsEnabled).toBe(false);
      expect(prefs.emailEnabled).toBe(false);
    });

    it('should enable SMS and Email notifications via updatePreferences', async () => {
      const updated = await service.updatePreferences('acc-1', {
        smsEnabled: true,
        emailEnabled: true,
        phone: '11999999999',
        email: 'cliente@email.com',
      });

      expect(updated.smsEnabled).toBe(true);
      expect(updated.emailEnabled).toBe(true);
      expect(updated.phone).toBe('11999999999');
      expect(updated.email).toBe('cliente@email.com');

      const notification = await service.notify('acc-1', 'tx-10', 'RECEIVE', 250);
      expect(notification.channels).toEqual(['IN_APP', 'SMS', 'EMAIL']);
    });

    it('should enable channels using channels array in updatePreferences', async () => {
      const updated = await service.updatePreferences('acc-2', {
        channels: ['EMAIL'],
      });

      expect(updated.smsEnabled).toBe(false);
      expect(updated.emailEnabled).toBe(true);

      const notification = await service.notify('acc-2', 'tx-20', 'TRANSFER', 75);
      expect(notification.channels).toEqual(['IN_APP', 'EMAIL']);
    });

    it('should enable and disable specific channels via helper methods', async () => {
      await service.enableChannel('acc-3', 'SMS', '11988887777');
      expect((await service.getPreferences('acc-3')).smsEnabled).toBe(true);

      await service.disableChannel('acc-3', 'SMS');
      expect((await service.getPreferences('acc-3')).smsEnabled).toBe(false);
    });

    it('should throw BadRequestException when updatePreferences receives empty payload', async () => {
      await expect(service.updatePreferences('acc-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
