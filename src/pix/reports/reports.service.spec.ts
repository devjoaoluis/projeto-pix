import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';

// Query builder falso: qualquer método encadeia e o await devolve `result`.
const chain = (result: unknown) => {
  const builder: any = {
    then: (resolve: (value: unknown) => void) => resolve(result),
  };
  for (const method of ['from', 'where', 'values', 'returning', 'orderBy']) {
    builder[method] = jest.fn(() => builder);
  }
  return builder;
};

const user = { id: 'user-1' };
const account = { id: 'acc-A', userId: 'user-1' };

describe('ReportsService', () => {
  let service: ReportsService;
  let db: any;

  // Cada select/insert consome o próximo resultado da fila.
  const queue = (fn: jest.Mock, ...results: unknown[]) =>
    results.map((result) => {
      const builder = chain(result);
      fn.mockReturnValueOnce(builder);
      return builder;
    });

  beforeEach(() => {
    db = { select: jest.fn(), insert: jest.fn() };
    service = new ReportsService(db);
  });

  describe('createUserReport', () => {
    it('soma enviados e recebidos da conta do usuário', async () => {
      const transactions = [
        { senderAccountId: 'acc-A', receiverAccountId: 'acc-B', amount: '100.00' },
        { senderAccountId: 'acc-B', receiverAccountId: 'acc-A', amount: '40.50' },
      ];
      queue(db.select, [user], [account], transactions);
      const [insert] = queue(db.insert, [{ id: 'rep-1' }]);

      const result = await service.createUserReport('user-1');

      expect(insert.values).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'USER',
        totalTransactions: 2,
        totalSent: '100.00',
        totalReceived: '40.50',
      });
      expect(result.transactions).toHaveLength(2);
    });

    it('lança 404 se o usuário não existe', async () => {
      queue(db.select, []);

      await expect(service.createUserReport('x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lança 404 se o usuário não tem conta bancária', async () => {
      queue(db.select, [user], []);

      await expect(service.createUserReport('user-1')).rejects.toThrow(
        'Conta bancária não encontrada',
      );
    });
  });

  describe('createPeriodReport', () => {
    it('rejeita período com data inicial maior que a final, sem consultar o banco', async () => {
      await expect(
        service.createPeriodReport('user-1', '2026-02-10', '2026-02-01'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.select).not.toHaveBeenCalled();
    });

    it('grava o período e os totais', async () => {
      queue(db.select, [user], [account], [
        { senderAccountId: 'acc-A', receiverAccountId: 'acc-B', amount: '25.00' },
      ]);
      const [insert] = queue(db.insert, [{ id: 'rep-2' }]);

      await service.createPeriodReport('user-1', '2026-02-01', '2026-02-10');

      const saved = insert.values.mock.calls[0][0];
      expect(saved).toMatchObject({
        type: 'PERIOD',
        totalTransactions: 1,
        totalSent: '25.00',
        totalReceived: '0.00',
      });
      expect(saved.startDate).toBeInstanceOf(Date);
      expect(saved.endDate).toBeInstanceOf(Date);
    });
  });

  describe('getReport', () => {
    it('devolve o relatório existente', async () => {
      queue(db.select, [{ id: 'rep-1' }]);

      await expect(service.getReport('rep-1')).resolves.toEqual({ id: 'rep-1' });
    });

    it('lança 404 se não existe', async () => {
      queue(db.select, []);

      await expect(service.getReport('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getReportsByUser', () => {
    it('lista os relatórios do usuário', async () => {
      queue(db.select, [user], [{ id: 'rep-1' }, { id: 'rep-2' }]);

      await expect(service.getReportsByUser('user-1')).resolves.toHaveLength(2);
    });

    it('lança 404 se o usuário não existe', async () => {
      queue(db.select, []);

      await expect(service.getReportsByUser('x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
