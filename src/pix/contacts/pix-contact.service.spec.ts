/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PixContactService } from './pix-contact.service';

describe('PixContactService', () => {
  let service: PixContactService;
  let dbMock: any;
  let selectQueue: any[][];
  let insertQueue: any[][];
  let updateQueue: any[][];

  function enqueueSelect(...results: any[][]) {
    selectQueue.push(...results);
  }

  function enqueueInsert(...results: any[][]) {
    insertQueue.push(...results);
  }

  function enqueueUpdate(...results: any[][]) {
    updateQueue.push(...results);
  }

  beforeEach(async () => {
    selectQueue = [];
    insertQueue = [];
    updateQueue = [];

    dbMock = {
      select: jest.fn(() => {
        const result = selectQueue.shift() ?? [];
        const chain: any = {
          from: jest.fn(() => chain),
          where: jest.fn(() => Promise.resolve(result)),
        };
        return chain;
      }),
      insert: jest.fn(() => {
        const result = insertQueue.shift() ?? [];
        const chain: any = {
          values: jest.fn(() => chain),
          returning: jest.fn(() => Promise.resolve(result)),
        };
        return chain;
      }),
      update: jest.fn(() => {
        const result = updateQueue.shift() ?? [];
        const chain: any = {
          set: jest.fn(() => chain),
          where: jest.fn(() => chain),
          returning: jest.fn(() => Promise.resolve(result)),
        };
        return chain;
      }),
      delete: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve([])),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PixContactService, { provide: 'DRIZZLE', useValue: dbMock }],
    }).compile();

    service = module.get<PixContactService>(PixContactService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve cadastrar contato integrando automaticamente com sua chave PIX ativa', async () => {
    const owner = { id: 'user-1', name: 'João' };
    const pixKey = {
      id: 'key-1',
      key: 'maria@email.com',
      type: 'EMAIL',
      status: 'ACTIVE',
      bankAccountId: 'acc-maria',
    };
    const createdContact = {
      id: 'contact-1',
      ownerUserId: 'user-1',
      name: 'Maria Oliveira',
      email: 'maria@email.com',
      pixKey: 'maria@email.com',
      pixKeyType: 'EMAIL',
      pixKeyId: 'key-1',
      contactBankAccountId: 'acc-maria',
    };

    // 1. ensureUserExists, 2. resolveContactPixKey, 3. duplicate check
    enqueueSelect([owner], [pixKey], []);
    enqueueInsert([createdContact]);

    const result = await service.create('user-1', {
      name: 'Maria Oliveira',
      email: 'maria@email.com',
    });

    expect(result).toEqual(createdContact);
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
  });

  it('deve lançar NotFoundException quando nenhuma chave PIX for encontrada para o contato', async () => {
    const owner = { id: 'user-1', name: 'João' };
    enqueueSelect([owner], []);

    await expect(
      service.create('user-1', {
        name: 'Contato Sem Pix',
        phone: '11900000000',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('deve lançar BadRequestException quando a chave PIX do contato estiver suspensa', async () => {
    const owner = { id: 'user-1', name: 'João' };
    const suspendedKey = {
      id: 'key-susp',
      key: 'susp@email.com',
      type: 'EMAIL',
      status: 'SUSPENDED',
      bankAccountId: 'acc-2',
    };

    enqueueSelect([owner], [suspendedKey]);

    await expect(
      service.create('user-1', {
        name: 'Contato Suspenso',
        pixKey: 'susp@email.com',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve lançar ConflictException ao tentar cadastrar contato duplicado com mesma chave PIX', async () => {
    const owner = { id: 'user-1', name: 'João' };
    const pixKey = {
      id: 'key-1',
      key: 'maria@email.com',
      type: 'EMAIL',
      status: 'ACTIVE',
      bankAccountId: 'acc-maria',
    };
    const existing = { id: 'contact-1', pixKey: 'maria@email.com' };

    enqueueSelect([owner], [pixKey], [existing]);

    await expect(
      service.create('user-1', {
        name: 'Maria',
        pixKey: 'maria@email.com',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('deve sincronizar identificadores da agenda e retornar chaves PIX ativas correspondentes', async () => {
    const owner = { id: 'user-1', name: 'João' };
    const key1 = {
      id: 'key-1',
      key: '11999999999',
      type: 'PHONE',
      status: 'ACTIVE',
      bankAccountId: 'acc-2',
    };

    // 1. ensureUserExists, 2. lookup 11999999999, 3. lookup inexistente@email.com
    enqueueSelect([owner], [key1], []);

    const result = await service.syncContacts('user-1', [
      '11999999999',
      'inexistente@email.com',
    ]);

    expect(result.matchedCount).toBe(1);
    expect(result.pixKeys).toEqual([key1]);
  });

  it('deve atualizar dados e chave PIX de um contato', async () => {
    const existing = {
      id: 'contact-1',
      ownerUserId: 'user-1',
      name: 'Maria',
      pixKey: 'maria@email.com',
    };
    const newKey = {
      id: 'key-2',
      key: '11988887777',
      type: 'PHONE',
      status: 'ACTIVE',
      bankAccountId: 'acc-maria',
    };
    const updated = {
      ...existing,
      nickname: 'Mariazinha',
      pixKey: '11988887777',
      pixKeyType: 'PHONE',
    };

    enqueueSelect([existing], [newKey]);
    enqueueUpdate([updated]);

    const result = await service.update('user-1', 'contact-1', {
      nickname: 'Mariazinha',
      pixKey: '11988887777',
    });

    expect(result.pixKey).toBe('11988887777');
    expect(result.nickname).toBe('Mariazinha');
  });

  it('deve remover um contato do usuário', async () => {
    const existing = {
      id: 'contact-1',
      ownerUserId: 'user-1',
      name: 'Maria',
    };
    enqueueSelect([existing]);

    const result = await service.remove('user-1', 'contact-1');

    expect(result).toEqual({ message: 'Contato removido com sucesso' });
    expect(dbMock.delete).toHaveBeenCalledTimes(1);
  });
});
