/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PixKeyController } from './pix-key.controller';
import { PixKeyService } from './pix-key.service';
import { CreatePixKeyDto } from './dto/create-pix-key.dto';
import { UpdatePixKeyDto } from './dto/update-pix-key.dto';

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

  describe('create', () => {
    it('deve chamar service.create com os parâmetros corretos', async () => {
      const dto: CreatePixKeyDto = { key: 'test@email.com' };
      const expected = { id: 'key-1', ...dto };
      mockPixKeyService.create.mockResolvedValue(expected);

      const result = await controller.create('acc-1', dto);
      expect(service.create).toHaveBeenCalledWith('acc-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('findByAccount', () => {
    it('deve chamar service.findByAccount', async () => {
      const expected = [{ id: 'key-1' }];
      mockPixKeyService.findByAccount.mockResolvedValue(expected);

      const result = await controller.findByAccount('acc-1');
      expect(service.findByAccount).toHaveBeenCalledWith('acc-1');
      expect(result).toEqual(expected);
    });
  });

  describe('generateRandomKey', () => {
    it('deve chamar service.generateRandomKey', async () => {
      const expected = { id: 'key-rnd', key: 'random-uuid' };
      mockPixKeyService.generateRandomKey.mockResolvedValue(expected);

      const result = await controller.generateRandomKey('acc-1');
      expect(service.generateRandomKey).toHaveBeenCalledWith('acc-1');
      expect(result).toEqual(expected);
    });
  });

  describe('update (PATCH)', () => {
    it('deve chamar service.update com bankAccountId, id e dto', async () => {
      const dto: UpdatePixKeyDto = { key: 'novo@email.com' };
      const expected = { id: 'key-1', key: 'novo@email.com' };
      mockPixKeyService.update.mockResolvedValue(expected);

      const result = await controller.update('acc-1', 'key-1', dto);
      expect(service.update).toHaveBeenCalledWith('acc-1', 'key-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('updatePut (PUT)', () => {
    it('deve chamar service.update com bankAccountId, id e dto', async () => {
      const dto: UpdatePixKeyDto = { key: 'novo@email.com' };
      const expected = { id: 'key-1', key: 'novo@email.com' };
      mockPixKeyService.update.mockResolvedValue(expected);

      const result = await controller.updatePut('acc-1', 'key-1', dto);
      expect(service.update).toHaveBeenCalledWith('acc-1', 'key-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('updateRandomKey', () => {
    it('deve chamar service.updateRandomKey', async () => {
      const expected = { id: 'key-1', key: 'new-rnd-uuid' };
      mockPixKeyService.updateRandomKey.mockResolvedValue(expected);

      const result = await controller.updateRandomKey('acc-1', 'key-1');
      expect(service.updateRandomKey).toHaveBeenCalledWith('acc-1', 'key-1');
      expect(result).toEqual(expected);
    });
  });

  describe('updateById (PATCH :id)', () => {
    it('deve chamar service.updateWithoutAccount', async () => {
      const dto: UpdatePixKeyDto = { key: 'novo@email.com' };
      const expected = { id: 'key-1', key: 'novo@email.com' };
      mockPixKeyService.updateWithoutAccount.mockResolvedValue(expected);

      const result = await controller.updateById('key-1', dto);
      expect(service.updateWithoutAccount).toHaveBeenCalledWith('key-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('updateByIdPut (PUT :id)', () => {
    it('deve chamar service.updateWithoutAccount', async () => {
      const dto: UpdatePixKeyDto = { bankAccountId: 'acc-2' };
      const expected = { id: 'key-1', bankAccountId: 'acc-2' };
      mockPixKeyService.updateWithoutAccount.mockResolvedValue(expected);

      const result = await controller.updateByIdPut('key-1', dto);
      expect(service.updateWithoutAccount).toHaveBeenCalledWith('key-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('deve chamar service.remove', async () => {
      const expected = { message: 'Chave Pix removida com sucesso' };
      mockPixKeyService.remove.mockResolvedValue(expected);

      const result = await controller.remove('acc-1', 'key-1');
      expect(service.remove).toHaveBeenCalledWith('acc-1', 'key-1');
      expect(result).toEqual(expected);
    });
  });
});
