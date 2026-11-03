/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { PixKeyService } from './pix-key.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PixKeyType } from './enums/pix-key-type.enum';

describe('PixKeyService', () => {
  let service: PixKeyService;
  let dbMock: any;
  let selectQueue: any[][];
  let insertResult: any[];
  let updateResult: any[];
  let deleteResult: any;

  function enqueueSelect(...results: any[][]) {
    selectQueue.push(...results);
  }

  beforeEach(async () => {
    selectQueue = [];
    insertResult = [];
    updateResult = [];
    deleteResult = [];

    dbMock = {
      select: jest.fn(() => {
        const result = selectQueue.shift() ?? [];
        const chain: any = {
          from: jest.fn(() => chain),
          where: jest.fn(() => chain),
          then: (onFulfilled: any, onRejected: any) =>
            Promise.resolve(result).then(onFulfilled, onRejected),
        };
        return chain;
      }),
      insert: jest.fn(() => {
        const chain: any = {
          values: jest.fn(() => chain),
          returning: jest.fn(() => Promise.resolve(insertResult)),
        };
        return chain;
      }),
      update: jest.fn(() => {
        const chain: any = {
          set: jest.fn(() => chain),
          where: jest.fn(() => chain),
          returning: jest.fn(() => Promise.resolve(updateResult)),
        };
        return chain;
      }),
      delete: jest.fn(() => {
        const chain: any = {
          where: jest.fn(() => Promise.resolve(deleteResult)),
        };
        return chain;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PixKeyService,
        {
          provide: 'DRIZZLE',
          useValue: dbMock,
        },
      ],
    }).compile();

    service = module.get<PixKeyService>(PixKeyService);
  });

  describe('create', () => {
    it('deve lançar NotFoundException quando a conta bancária não existir', async () => {
      enqueueSelect([]); // bankAccount not found

      await expect(
        service.create('acc-1', { key: 'test@email.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ConflictException quando a chave Pix já estiver cadastrada', async () => {
      enqueueSelect([{ id: 'acc-1' }]); // bankAccount exists
      enqueueSelect([{ id: 'key-existing', key: 'test@email.com' }]); // existing key

      await expect(
        service.create('acc-1', { key: 'test@email.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve criar uma chave Pix do tipo EMAIL com sucesso e normalizada', async () => {
      const createdKey = {
        id: 'key-1',
        bankAccountId: 'acc-1',
        key: 'test@email.com',
        type: PixKeyType.EMAIL,
      };
      enqueueSelect([{ id: 'acc-1' }]); // bankAccount
      enqueueSelect([]); // key not existing
      insertResult = [createdKey];

      const result = await service.create('acc-1', {
        key: '  TEST@Email.com  ',
      });

      expect(result).toEqual(createdKey);
      expect(dbMock.insert).toHaveBeenCalled();
    });

    it('deve criar uma chave Pix do tipo PHONE com sucesso', async () => {
      const createdKey = {
        id: 'key-2',
        bankAccountId: 'acc-1',
        key: '+5511999999999',
        type: PixKeyType.PHONE,
      };
      enqueueSelect([{ id: 'acc-1' }]);
      enqueueSelect([]);
      insertResult = [createdKey];

      const result = await service.create('acc-1', { key: '+5511999999999' });

      expect(result).toEqual(createdKey);
    });

    it('deve criar uma chave Pix do tipo CPF com sucesso', async () => {
      const createdKey = {
        id: 'key-3',
        bankAccountId: 'acc-1',
        key: '12345678909',
        type: PixKeyType.CPF,
      };
      enqueueSelect([{ id: 'acc-1' }]);
      enqueueSelect([]);
      insertResult = [createdKey];

      const result = await service.create('acc-1', { key: '123.456.789-09' });

      expect(result).toEqual(createdKey);
    });

    it('deve criar uma chave Pix do tipo CNPJ com sucesso', async () => {
      const createdKey = {
        id: 'key-4',
        bankAccountId: 'acc-1',
        key: '12345678000195',
        type: PixKeyType.CNPJ,
      };
      enqueueSelect([{ id: 'acc-1' }]);
      enqueueSelect([]);
      insertResult = [createdKey];

      const result = await service.create('acc-1', {
        key: '12.345.678/0001-95',
      });

      expect(result).toEqual(createdKey);
    });
  });

  describe('findByAccount', () => {
    it('deve retornar as chaves vinculadas à conta', async () => {
      const keys = [{ id: 'key-1', bankAccountId: 'acc-1' }];
      enqueueSelect(keys);

      const result = await service.findByAccount('acc-1');
      expect(result).toEqual(keys);
    });
  });

  describe('findByKey', () => {
    it('deve buscar chave pelo valor', async () => {
      const keyObj = { id: 'key-1', key: 'user@email.com' };
      enqueueSelect([keyObj]);

      const result = await service.findByKey('user@email.com');
      expect(result).toEqual(keyObj);
    });
  });

  describe('findById', () => {
    it('deve buscar chave pelo id', async () => {
      const keyObj = { id: 'key-1', key: 'user@email.com' };
      enqueueSelect([keyObj]);

      const result = await service.findById('key-1');
      expect(result).toEqual(keyObj);
    });
  });

  describe('remove', () => {
    it('deve lançar NotFoundException se a chave não existir na conta', async () => {
      enqueueSelect([]);

      await expect(service.remove('acc-1', 'key-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve remover a chave com sucesso', async () => {
      enqueueSelect([{ id: 'key-1', bankAccountId: 'acc-1' }]);

      const result = await service.remove('acc-1', 'key-1');
      expect(result).toEqual({ message: 'Chave Pix removida com sucesso' });
      expect(dbMock.delete).toHaveBeenCalled();
    });
  });

  describe('generateRandomKey', () => {
    it('deve gerar e inserir uma chave aleatória', async () => {
      const randomKey = {
        id: 'key-rnd',
        bankAccountId: 'acc-1',
        key: 'e30a524e-72bc-448e-8a21-654e5657b98c',
        type: PixKeyType.RANDOM,
      };
      insertResult = [randomKey];

      const result = await service.generateRandomKey('acc-1');
      expect(result).toEqual(randomKey);
      expect(dbMock.insert).toHaveBeenCalled();
    });
  });

  describe('update (Alterar Chave PIX Associada)', () => {
    it('deve lançar BadRequestException se nenhum campo for enviado', async () => {
      await expect(service.update('acc-1', 'key-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar NotFoundException se a conta bancária não existir', async () => {
      enqueueSelect([]); // bankAccount not found

      await expect(
        service.update('acc-not-found', 'key-1', { key: 'novo@email.com' }),
      ).rejects.toThrow(new NotFoundException('Conta bancária não encontrada'));
    });

    it('deve lançar NotFoundException se a chave Pix não for encontrada na conta', async () => {
      enqueueSelect([{ id: 'acc-1' }]); // bankAccount exists
      enqueueSelect([]); // pixKey not found

      await expect(
        service.update('acc-1', 'key-not-found', { key: 'novo@email.com' }),
      ).rejects.toThrow(new NotFoundException('Chave Pix não encontrada'));
    });

    it('deve alterar o valor da chave e atualizar o tipo com sucesso', async () => {
      const currentPixKey = {
        id: 'key-1',
        bankAccountId: 'acc-1',
        key: 'antigo@email.com',
        type: PixKeyType.EMAIL,
      };
      const updatedPixKey = {
        ...currentPixKey,
        key: 'novo@email.com',
        type: PixKeyType.EMAIL,
      };

      enqueueSelect([{ id: 'acc-1' }]); // bankAccount
      enqueueSelect([currentPixKey]); // current pixKey
      enqueueSelect([]); // findByKey (uniqueness check)
      updateResult = [updatedPixKey];

      const result = await service.update('acc-1', 'key-1', {
        key: 'novo@email.com',
      });

      expect(result).toEqual(updatedPixKey);
      expect(dbMock.update).toHaveBeenCalled();
    });

    it('deve lançar ConflictException se o novo valor de chave já estiver em uso por outro registro', async () => {
      const currentPixKey = {
        id: 'key-1',
        bankAccountId: 'acc-1',
        key: 'antigo@email.com',
        type: PixKeyType.EMAIL,
      };
      const anotherKey = {
        id: 'key-2',
        bankAccountId: 'acc-2',
        key: 'novo@email.com',
      };

      enqueueSelect([{ id: 'acc-1' }]); // bankAccount
      enqueueSelect([currentPixKey]); // current pixKey
      enqueueSelect([anotherKey]); // findByKey returns existing key with different ID

      await expect(
        service.update('acc-1', 'key-1', { key: 'novo@email.com' }),
      ).rejects.toThrow(
        new ConflictException('Esta chave Pix já está cadastrada'),
      );
    });

    it('não deve lançar conflito se o novo valor normalizado for o mesmo da chave atual', async () => {
      const currentPixKey = {
        id: 'key-1',
        bankAccountId: 'acc-1',
        key: 'mesmo@email.com',
        type: PixKeyType.EMAIL,
      };

      enqueueSelect([{ id: 'acc-1' }]); // bankAccount
      enqueueSelect([currentPixKey]); // current pixKey

      const result = await service.update('acc-1', 'key-1', {
        key: 'MESMO@email.com',
      });

      expect(result).toEqual(currentPixKey);
    });

    it('deve alterar a conta bancária associada (portabilidade) com sucesso', async () => {
      const currentPixKey = {
        id: 'key-1',
        bankAccountId: 'acc-1',
        key: 'chave@email.com',
        type: PixKeyType.EMAIL,
      };
      const updatedPixKey = {
        ...currentPixKey,
        bankAccountId: 'acc-2',
      };

      enqueueSelect([{ id: 'acc-1' }]); // current bankAccount
      enqueueSelect([currentPixKey]); // current pixKey
      enqueueSelect([{ id: 'acc-2' }]); // target bankAccount exists
      updateResult = [updatedPixKey];

      const result = await service.update('acc-1', 'key-1', {
        bankAccountId: 'acc-2',
      });

      expect(result).toEqual(updatedPixKey);
      expect(dbMock.update).toHaveBeenCalled();
    });

    it('deve aceitar newBankAccountId como alias para alteração de conta', async () => {
      const currentPixKey = {
        id: 'key-1',
        bankAccountId: 'acc-1',
        key: 'chave@email.com',
        type: PixKeyType.EMAIL,
      };
      const updatedPixKey = {
        ...currentPixKey,
        bankAccountId: 'acc-3',
      };

      enqueueSelect([{ id: 'acc-1' }]);
      enqueueSelect([currentPixKey]);
      enqueueSelect([{ id: 'acc-3' }]);
      updateResult = [updatedPixKey];

      const result = await service.update('acc-1', 'key-1', {
        newBankAccountId: 'acc-3',
      });

      expect(result).toEqual(updatedPixKey);
    });

    it('deve lançar NotFoundException se a nova conta bancária de destino não existir', async () => {
      const currentPixKey = {
        id: 'key-1',
        bankAccountId: 'acc-1',
        key: 'chave@email.com',
        type: PixKeyType.EMAIL,
      };

      enqueueSelect([{ id: 'acc-1' }]);
      enqueueSelect([currentPixKey]);
      enqueueSelect([]); // target bankAccount not found

      await expect(
        service.update('acc-1', 'key-1', { bankAccountId: 'acc-not-exist' }),
      ).rejects.toThrow(
        new NotFoundException('Nova conta bancária não encontrada'),
      );
    });

    it('deve alterar tanto o valor da chave quanto a conta bancária associada', async () => {
      const currentPixKey = {
        id: 'key-1',
        bankAccountId: 'acc-1',
        key: 'antigo@email.com',
        type: PixKeyType.EMAIL,
      };
      const updatedPixKey = {
        id: 'key-1',
        bankAccountId: 'acc-2',
        key: '+5511988887777',
        type: PixKeyType.PHONE,
      };

      enqueueSelect([{ id: 'acc-1' }]); // bankAccount
      enqueueSelect([currentPixKey]); // current pixKey
      enqueueSelect([]); // findByKey (not conflict)
      enqueueSelect([{ id: 'acc-2' }]); // target bankAccount
      updateResult = [updatedPixKey];

      const result = await service.update('acc-1', 'key-1', {
        key: '+5511988887777',
        bankAccountId: 'acc-2',
      });

      expect(result).toEqual(updatedPixKey);
    });
  });

  describe('updateWithoutAccount', () => {
    it('deve lançar NotFoundException se a chave não existir', async () => {
      enqueueSelect([]); // findById not found

      await expect(
        service.updateWithoutAccount('key-not-found', {
          key: 'novo@email.com',
        }),
      ).rejects.toThrow(new NotFoundException('Chave Pix não encontrada'));
    });

    it('deve atualizar chave descobrindo a conta automaticamente', async () => {
      const currentPixKey = {
        id: 'key-1',
        bankAccountId: 'acc-auto',
        key: 'antigo@email.com',
        type: PixKeyType.EMAIL,
      };
      const updatedPixKey = {
        ...currentPixKey,
        key: 'novo@email.com',
      };

      enqueueSelect([currentPixKey]); // findById
      enqueueSelect([{ id: 'acc-auto' }]); // bankAccount in update
      enqueueSelect([currentPixKey]); // current pixKey in update
      enqueueSelect([]); // findByKey
      updateResult = [updatedPixKey];

      const result = await service.updateWithoutAccount('key-1', {
        key: 'novo@email.com',
      });

      expect(result).toEqual(updatedPixKey);
    });
  });

  describe('updateRandomKey', () => {
    it('deve atualizar chave com novo UUID aleatório', async () => {
      const currentPixKey = {
        id: 'key-1',
        bankAccountId: 'acc-1',
        key: 'antigo-uuid',
        type: PixKeyType.RANDOM,
      };

      enqueueSelect([{ id: 'acc-1' }]);
      enqueueSelect([currentPixKey]);
      enqueueSelect([]); // findByKey
      updateResult = [{ ...currentPixKey, key: 'new-random-uuid' }];

      const result = await service.updateRandomKey('acc-1', 'key-1');
      expect(result.key).toBe('new-random-uuid');
    });
  });
});
