/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PixKeyController } from './pix-key.controller';
import { PixKeyService } from './pix-key.service';
import { CreatePixKeyDto } from './dto/create-pix-key.dto';
import { UpdatePixKeyDto } from './dto/update-pix-key.dto';
import { SuspendPixKeyDto } from './dto/suspend-pix-key.dto';

describe('PixKeyController', () => {
  let controller: PixKeyController;
  let service: PixKeyService;

  const mockPixKeyService = {
    create: jest.fn(),
    findByAccount: jest.fn(),
    generateRandomKey: jest.fn(),
    update: jest.fn(),
    updateWithoutAccount: jest.fn(),
    updateRandomKey: jest.fn(),
    unblock: jest.fn(),
    unblockWithoutAccount: jest.fn(),
    suspend: jest.fn(),
    suspendWithoutAccount: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PixKeyController],
      providers: [
        {
          provide: PixKeyService,
          useValue: mockPixKeyService,
        },
      ],
    }).compile();

    controller = module.get<PixKeyController>(PixKeyController);
    service = module.get<PixKeyService>(PixKeyService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('deve criar chave Pix via POST account/:bankAccountId', async () => {
    const dto: CreatePixKeyDto = { key: 'test@email.com' };
    const expected = { id: 'key-1', ...dto };
    mockPixKeyService.create.mockResolvedValue(expected);

    const result = await controller.create('acc-1', dto);
    expect(service.create).toHaveBeenCalledWith('acc-1', dto);
    expect(result).toEqual(expected);
  });

  it('deve listar chaves da conta via GET account/:bankAccountId', async () => {
    const expected = [{ id: 'key-1' }];
    mockPixKeyService.findByAccount.mockResolvedValue(expected);

    const result = await controller.findByAccount('acc-1');
    expect(service.findByAccount).toHaveBeenCalledWith('acc-1');
    expect(result).toEqual(expected);
  });

  it('deve gerar chave aleatória via POST account/:bankAccountId/random', async () => {
    const expected = { id: 'key-rnd', key: 'random-uuid' };
    mockPixKeyService.generateRandomKey.mockResolvedValue(expected);

    const result = await controller.generateRandomKey('acc-1');
    expect(service.generateRandomKey).toHaveBeenCalledWith('acc-1');
    expect(result).toEqual(expected);
  });

  it('deve atualizar chave via PATCH account/:bankAccountId/:id', async () => {
    const dto: UpdatePixKeyDto = { key: 'novo@email.com' };
    const expected = { id: 'key-1', key: 'novo@email.com' };
    mockPixKeyService.update.mockResolvedValue(expected);

    const result = await controller.update('acc-1', 'key-1', dto);
    expect(service.update).toHaveBeenCalledWith('acc-1', 'key-1', dto);
    expect(result).toEqual(expected);
  });

  it('deve regenerar chave aleatória via PATCH account/:bankAccountId/:id/random', async () => {
    const expected = { id: 'key-1', key: 'new-rnd-uuid' };
    mockPixKeyService.updateRandomKey.mockResolvedValue(expected);

    const result = await controller.updateRandomKey('acc-1', 'key-1');
    expect(service.updateRandomKey).toHaveBeenCalledWith('acc-1', 'key-1');
    expect(result).toEqual(expected);
  });

  it('deve suspender e desbloquear chave vinculada à conta', async () => {
    const dto: SuspendPixKeyDto = { reason: 'Suspeita' };
    mockPixKeyService.suspend.mockResolvedValue({
      id: 'key-1',
      status: 'SUSPENDED',
    });
    mockPixKeyService.unblock.mockResolvedValue({
      id: 'key-1',
      status: 'ACTIVE',
    });

    await controller.suspend('acc-1', 'key-1', dto);
    expect(service.suspend).toHaveBeenCalledWith('acc-1', 'key-1', 'Suspeita');

    await controller.unblock('acc-1', 'key-1');
    expect(service.unblock).toHaveBeenCalledWith('acc-1', 'key-1');
  });

  it('deve atualizar, suspender e desbloquear chave diretamente por :id', async () => {
    mockPixKeyService.updateWithoutAccount.mockResolvedValue({ id: 'key-1' });
    mockPixKeyService.suspendWithoutAccount.mockResolvedValue({
      id: 'key-1',
      status: 'SUSPENDED',
    });
    mockPixKeyService.unblockWithoutAccount.mockResolvedValue({
      id: 'key-1',
      status: 'ACTIVE',
    });

    await controller.updateById('key-1', { key: 'a@b.com' });
    expect(service.updateWithoutAccount).toHaveBeenCalledWith('key-1', {
      key: 'a@b.com',
    });

    await controller.suspendById('key-1', { reason: 'Manual' });
    expect(service.suspendWithoutAccount).toHaveBeenCalledWith(
      'key-1',
      'Manual',
    );

    await controller.unblockById('key-1');
    expect(service.unblockWithoutAccount).toHaveBeenCalledWith('key-1');
  });

  it('deve remover chave via DELETE account/:bankAccountId/:id', async () => {
    const expected = { message: 'Chave Pix removida com sucesso' };
    mockPixKeyService.remove.mockResolvedValue(expected);

    const result = await controller.remove('acc-1', 'key-1');
    expect(service.remove).toHaveBeenCalledWith('acc-1', 'key-1');
    expect(result).toEqual(expected);
  });
});
