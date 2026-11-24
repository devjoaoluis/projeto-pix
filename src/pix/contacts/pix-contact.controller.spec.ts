import { Test, TestingModule } from '@nestjs/testing';
import { PixContactController } from './pix-contact.controller';
import { PixContactService } from './pix-contact.service';

describe('PixContactController', () => {
  let controller: PixContactController;
  let service: jest.Mocked<Partial<PixContactService>>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAllByUser: jest.fn(),
      findById: jest.fn(),
      syncContacts: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PixContactController],
      providers: [{ provide: PixContactService, useValue: service }],
    }).compile();

    controller = module.get<PixContactController>(PixContactController);
  });

  it('deve criar um contato integrado com chave PIX', async () => {
    const created = { id: 'c-1', name: 'Maria', pixKey: 'maria@email.com' };
    (service.create as jest.Mock).mockResolvedValue(created);

    const result = await controller.create('user-1', {
      name: 'Maria',
      email: 'maria@email.com',
    });

    expect(service.create).toHaveBeenCalledWith('user-1', {
      name: 'Maria',
      email: 'maria@email.com',
    });
    expect(result).toEqual(created);
  });

  it('deve listar contatos do usuário', async () => {
    const list = [{ id: 'c-1', name: 'Maria' }];
    (service.findAllByUser as jest.Mock).mockResolvedValue(list);

    const result = await controller.findAllByUser('user-1');

    expect(service.findAllByUser).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(list);
  });

  it('deve sincronizar chaves PIX a partir de lista de contatos', async () => {
    const syncResult = { userId: 'user-1', matchedCount: 1, pixKeys: [] };
    (service.syncContacts as jest.Mock).mockResolvedValue(syncResult);

    const result = await controller.syncContacts('user-1', ['11999999999']);

    expect(service.syncContacts).toHaveBeenCalledWith('user-1', [
      '11999999999',
    ]);
    expect(result).toEqual(syncResult);
  });
});
