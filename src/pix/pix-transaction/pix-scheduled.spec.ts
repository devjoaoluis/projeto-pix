import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PixTransactionService } from './pix-transaction.service';
import { TransferPixDto } from './dto/transfer-pix.dto';
import { SchedulePixDto } from './dto/schedule-pix.dto';
import { bankAccounts, pixTransactions } from '../../db/schema';

// Query builder falso: qualquer método encadeia e o await devolve `result`.
const chain = (result: unknown) => {
  const builder: any = { then: (resolve: (value: unknown) => void) => resolve(result) };
  for (const method of ['from', 'where', 'set', 'values', 'returning', 'innerJoin', 'orderBy']) {
    builder[method] = jest.fn(() => builder);
  }
  return builder;
};

const sender = { id: 'acc-A', balance: '200.00', status: 'ACTIVE' };
const receiver = { id: 'acc-B', balance: '0.00', status: 'ACTIVE' };
const pixKey = { id: 'key-1', bankAccountId: 'acc-B', key: 'chave-b' };

describe('PIX agendado e localização', () => {
  let service: PixTransactionService;
  let db: any;
  let tx: any;
  let notify: jest.Mock;

  // Cada chamada de select/insert/update consome o próximo resultado da fila.
  const queue = (fn: jest.Mock, ...results: unknown[]) =>
    results.map((result) => {
      const builder = chain(result);
      fn.mockReturnValueOnce(builder);
      return builder;
    });

  beforeEach(() => {
    tx = { update: jest.fn(), insert: jest.fn() };
    db = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      transaction: jest.fn((cb) => cb(tx)),
    };
    notify = jest.fn();
    service = new PixTransactionService(db, { notify } as any);
  });

  describe('localização (#26)', () => {
    const errorsOf = async (body: object) =>
      (await validate(plainToInstance(TransferPixDto, body))).map((e) => e.property);
    const base = { pixKey: 'chave-b', amount: 10 };

    it('aceita transferência sem localização e com localização válida', async () => {
      expect(await errorsOf(base)).toEqual([]);
      expect(await errorsOf({ ...base, latitude: -23.55, longitude: -46.63 })).toEqual([]);
    });

    it('rejeita coordenadas fora da faixa', async () => {
      expect(await errorsOf({ ...base, latitude: 90.1, longitude: -180.1 })).toEqual([
        'latitude',
        'longitude',
      ]);
    });

    it('rejeita latitude sem longitude', async () => {
      expect(await errorsOf({ ...base, latitude: 10 })).toEqual(['longitude']);
    });

    it('grava latitude e longitude na transação', async () => {
      queue(db.select, [sender], [pixKey], [receiver]);
      queue(tx.update, [{ id: 'acc-A' }], []);
      const [insert] = queue(tx.insert, [{ id: 'tx-1' }]);

      await service.transfer('acc-A', { pixKey: 'chave-b', amount: 10, latitude: -23.55, longitude: -46.63 });

      expect(insert.values).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: -23.55, longitude: -46.63, status: 'COMPLETED' }),
      );
    });
  });

  describe('agendamento (#27)', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();

    it('exige scheduledAt em formato de data', async () => {
      const errors = await validate(
        plainToInstance(SchedulePixDto, { pixKey: 'chave-b', amount: 10, scheduledAt: 'amanhã' }),
      );
      expect(errors.map((e) => e.property)).toEqual(['scheduledAt']);
    });

    it('rejeita data no passado', async () => {
      await expect(
        service.schedule('acc-A', { pixKey: 'chave-b', amount: 10, scheduledAt: '2020-01-01T00:00:00Z' }),
      ).rejects.toThrow(BadRequestException);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('cria a transação SCHEDULED sem movimentar saldo', async () => {
      queue(db.select, [sender], [pixKey]);
      const [insert] = queue(db.insert, [{ id: 'tx-9', status: 'SCHEDULED' }]);

      const result = await service.schedule('acc-A', { pixKey: 'chave-b', amount: 500, scheduledAt: future });

      expect(result).toEqual({ id: 'tx-9', status: 'SCHEDULED' });
      expect(insert.values).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'SCHEDULED', amount: '500', scheduledAt: new Date(future) }),
      );
      expect(insert.values.mock.calls[0][0]).not.toHaveProperty('receiverAccountId');
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('rejeita agendamento com idempotencyKey repetida', async () => {
      queue(db.select, [sender], [pixKey], [{ id: 'tx-antiga' }]);

      await expect(
        service.schedule('acc-A', { pixKey: 'chave-b', amount: 10, scheduledAt: future, idempotencyKey: 'k1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('cancel() de um agendamento só muda o status: não mexe em saldo nem avisa o destinatário', async () => {
      const scheduled = { id: 'tx-9', status: 'SCHEDULED', senderAccountId: 'acc-A', receiverAccountId: null, amount: '50.00' };
      queue(db.select, [scheduled]);
      queue(tx.update, [{ ...scheduled, status: 'CANCELED' }]);

      const result = await service.cancel('tx-9');

      expect(result.transaction.status).toBe('CANCELED');
      expect(tx.update).toHaveBeenCalledTimes(1);
      expect(tx.update).toHaveBeenCalledWith(pixTransactions);
      expect(tx.update).not.toHaveBeenCalledWith(bankAccounts);
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith('acc-A', 'tx-9', 'CANCELED', 50, expect.any(String));
    });

    it('executar agendamento atualiza a própria transação em vez de inserir outra', async () => {
      queue(db.select, [sender], [pixKey], [receiver]);
      const [, , execute] = queue(tx.update, [{ id: 'acc-A' }], [], [{ id: 'tx-9', status: 'COMPLETED' }]);

      const result = await service.transfer('acc-A', { pixKey: 'chave-b', amount: 10 }, 'tx-9');

      expect(result.transaction).toEqual({ id: 'tx-9', status: 'COMPLETED' });
      expect(execute.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'COMPLETED' }));
      expect(tx.insert).not.toHaveBeenCalled();
      expect(notify).toHaveBeenCalledTimes(2);
    });

    it('não executa duas vezes: agendamento que saiu de SCHEDULED gera Conflict e não notifica', async () => {
      queue(db.select, [sender], [pixKey], [receiver]);
      queue(tx.update, [{ id: 'acc-A' }], [], []);

      await expect(service.transfer('acc-A', { pixKey: 'chave-b', amount: 10 }, 'tx-9')).rejects.toThrow(
        ConflictException,
      );
      expect(notify).not.toHaveBeenCalled();
    });

    describe('job runDueScheduled', () => {
      const due = {
        transaction: { id: 'tx-9', senderAccountId: 'acc-A', amount: '50.00', description: null },
        pixKey: 'chave-b',
      };
      let transfer: jest.SpyInstance;

      beforeEach(() => {
        queue(db.select, [due]);
        transfer = jest.spyOn(service, 'transfer');
      });

      it('executa os vencidos pelo fluxo do transfer()', async () => {
        transfer.mockResolvedValue({} as any);

        await service.runDueScheduled();

        expect(transfer).toHaveBeenCalledWith(
          'acc-A',
          { pixKey: 'chave-b', amount: 50, description: undefined },
          'tx-9',
        );
        expect(db.update).not.toHaveBeenCalled();
      });

      it('marca FAILED e notifica quando falta saldo', async () => {
        transfer.mockRejectedValue(new BadRequestException('Saldo insuficiente'));
        const [update] = queue(db.update, [{ id: 'tx-9', status: 'FAILED' }]);

        await service.runDueScheduled();

        expect(update.set).toHaveBeenCalledWith({ status: 'FAILED' });
        expect(notify).toHaveBeenCalledWith('acc-A', 'tx-9', 'FAILED', 50, 'Saldo insuficiente');
      });

      it('não notifica falha se outro processo já tratou o agendamento', async () => {
        transfer.mockRejectedValue(new ConflictException('Agendamento já executado ou cancelado'));
        queue(db.update, []);

        await service.runDueScheduled();

        expect(notify).not.toHaveBeenCalled();
      });

      it('mantém SCHEDULED em erro de infraestrutura, para tentar de novo', async () => {
        transfer.mockRejectedValue(new Error('connection reset'));
        jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

        await service.runDueScheduled();

        expect(db.update).not.toHaveBeenCalled();
        expect(notify).not.toHaveBeenCalled();
      });
    });
  });
});
