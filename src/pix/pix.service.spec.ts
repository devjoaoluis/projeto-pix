/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import {
  buildPixBrCode,
  computeCrc16,
  PaymentStatus,
  PixService,
} from './pix.service';

describe('PixService (BR Code + CRC16 & Liquidação de Cobrança) & DbModule Shutdown', () => {
  it('gera BR Code EMV válido com CRC16-CCITT dinâmico e dados reais do titular', () => {
    const code = buildPixBrCode({
      pixKey: 'joao@exemplo.com',
      merchantName: 'João Luís Silva',
      merchantCity: 'São Paulo',
      amount: 150.5,
      txId: 'TX123456',
      description: 'Fatura Mensal',
    });

    expect(code.startsWith('000201010212')).toBe(true);
    expect(code).toContain('br.gov.bcb.pix');
    expect(code).toContain('joao@exemplo.com');
    expect(code).toContain('5406150.50');
    expect(code).toContain('Joao Luis Silva');
    expect(code).not.toContain('AcmeInc');

    // Confere integridade do CRC16 nos últimos 4 caracteres
    const withoutCrc = code.slice(0, -4);
    const crc = code.slice(-4);
    expect(computeCrc16(withoutCrc)).toBe(crc);
  });

  it('credita o saldo da conta bancária atomicamente e notifica ao liquidar cobrança Pix', async () => {
    const selectQueue: any[][] = [];
    const notifyMock = jest.fn().mockResolvedValue({ id: 'notif-1' });
    const txMock = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValueOnce([
        {
          id: 'charge-1',
          bankAccountId: 'acc-1',
          receiverAccountId: 'acc-1',
          amount: '250.00',
          status: PaymentStatus.PAID,
          type: 'PIX_CHARGE',
        },
      ]),
    };

    const dbMock = {
      select: jest.fn(() => {
        const rows = selectQueue.shift() ?? [];
        const chain: any = {
          from: jest.fn(() => chain),
          where: jest.fn(() => Promise.resolve(rows)),
        };
        return chain;
      }),
      insert: jest.fn(),
      transaction: jest.fn((cb: any) => cb(txMock)),
    };

    const service = new PixService(dbMock as any, { notify: notifyMock } as any);

    selectQueue.push([
      {
        id: 'charge-1',
        bankAccountId: 'acc-1',
        amount: '250.00',
        description: 'Venda #10',
        status: PaymentStatus.PENDING,
        type: 'PIX_CHARGE',
      },
    ]);

    const paid = await service.simulateWebhookEvent('charge-1');
    expect(paid.status).toBe(PaymentStatus.PAID);
    // 1º update = pixTransactions, 2º update = bankAccounts (crédito de saldo)
    expect(txMock.update).toHaveBeenCalledTimes(2);
    expect(notifyMock).toHaveBeenCalledWith(
      'acc-1',
      'charge-1',
      'RECEIVE',
      250,
      'Venda #10',
    );

    // Cobrança já paga -> ConflictException
    selectQueue.push([
      {
        id: 'charge-1',
        bankAccountId: 'acc-1',
        amount: '250.00',
        status: PaymentStatus.PAID,
        type: 'PIX_CHARGE',
      },
    ]);
    await expect(service.simulateWebhookEvent('charge-1')).rejects.toThrow(
      ConflictException,
    );

    // Inexistente -> NotFoundException
    selectQueue.push([]);
    await expect(service.simulateWebhookEvent('inexistente')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('DbModule encerra o pg.Pool de forma idempotente no onApplicationShutdown', async () => {
    const endMock = jest.fn().mockResolvedValue(undefined);
    const dbModule = new DbModule({ end: endMock } as any);

    await dbModule.onApplicationShutdown('SIGTERM');
    await dbModule.onApplicationShutdown('SIGTERM');

    expect(endMock).toHaveBeenCalledTimes(1);
  });
});
