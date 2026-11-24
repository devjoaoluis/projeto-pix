/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService.create', () => {
  const dto = {
    name: 'Ana',
    cpf: '52998224725',
    email: 'a@a.com',
    phone: '11999999999',
  };
  let repo: any;
  let service: UsersService;

  beforeEach(() => {
    repo = { create: jest.fn() };
    service = new UsersService(repo);
  });

  it('converte 23505 (em e.cause, como o drizzle) em 400', async () => {
    repo.create.mockRejectedValue(
      Object.assign(new Error('Failed query'), { cause: { code: '23505' } }),
    );
    await expect(service.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('relança outros erros', async () => {
    const err = new Error('boom');
    repo.create.mockRejectedValue(err);
    await expect(service.create(dto)).rejects.toBe(err);
  });
});

describe('CreateUserDto', () => {
  const base = {
    name: 'Ana',
    cpf: '529.982.247-25',
    email: 'a@a.com',
    phone: '11999999999',
  };
  const check = (o: object) =>
    validate(plainToInstance(CreateUserDto, o) as object);

  it('cpf formatado vira só dígitos', async () => {
    const inst = plainToInstance(CreateUserDto, base);
    expect(inst.cpf).toBe('52998224725');
    expect(await validate(inst)).toHaveLength(0);
  });

  it('nome só com espaços falha', async () => {
    expect(await check({ ...base, name: '   ' })).not.toHaveLength(0);
  });

  it('phone só com espaços falha', async () => {
    expect(await check({ ...base, phone: '   ' })).not.toHaveLength(0);
  });

  it('nome com 256 caracteres falha', async () => {
    expect(await check({ ...base, name: 'a'.repeat(256) })).not.toHaveLength(0);
  });

  it('phone com 21 caracteres falha', async () => {
    expect(await check({ ...base, phone: '1'.repeat(21) })).not.toHaveLength(0);
  });
});

describe('UsersService.update and remove', () => {
  const existingUser = {
    id: 'user-uuid-1',
    name: 'Ana',
    cpf: '52998224725',
    email: 'ana@email.com',
    phone: '11999999999',
  };
  let repo: any;
  let service: UsersService;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    service = new UsersService(repo);
  });

  describe('update', () => {
    it('deve lançar NotFoundException se usuário não existir', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.update('user-inexistente', { name: 'Novo Nome' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve atualizar os campos informados e fazer trim', async () => {
      repo.findById.mockResolvedValue(existingUser);
      const updated = { ...existingUser, name: 'Ana Silva', email: 'novo@email.com' };
      repo.update.mockResolvedValue(updated);

      const result = await service.update(existingUser.id, {
        name: '  Ana Silva  ',
        email: ' novo@email.com ',
      });

      expect(repo.update).toHaveBeenCalledWith(existingUser.id, {
        name: 'Ana Silva',
        email: 'novo@email.com',
      });
      expect(result).toEqual(updated);
    });

    it('deve suportar campos em português (nome e telefone)', async () => {
      repo.findById.mockResolvedValue(existingUser);
      repo.update.mockResolvedValue({
        ...existingUser,
        name: 'Ana Maria',
        phone: '11988887777',
      });

      const result = await service.update(existingUser.id, {
        nome: 'Ana Maria',
        telefone: '11988887777',
      });

      expect(repo.update).toHaveBeenCalledWith(existingUser.id, {
        name: 'Ana Maria',
        phone: '11988887777',
      });
      expect(result.name).toBe('Ana Maria');
    });

    it('deve retornar o usuário existente se o payload de atualização estiver vazio', async () => {
      repo.findById.mockResolvedValue(existingUser);

      const result = await service.update(existingUser.id, {});

      expect(repo.update).not.toHaveBeenCalled();
      expect(result).toEqual(existingUser);
    });

    it('deve converter erro 23505 em BadRequestException', async () => {
      repo.findById.mockResolvedValue(existingUser);
      repo.update.mockRejectedValue(
        Object.assign(new Error('Duplicate'), { cause: { code: '23505' } }),
      );

      await expect(
        service.update(existingUser.id, { email: 'outro@email.com' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deve lançar NotFoundException se usuário não existir', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.remove('user-inexistente')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deve remover usuário e retornar mensagem de sucesso', async () => {
      repo.findById.mockResolvedValue(existingUser);
      repo.remove.mockResolvedValue(existingUser);

      const result = await service.remove(existingUser.id);

      expect(repo.remove).toHaveBeenCalledWith(existingUser.id);
      expect(result).toEqual({ message: 'Usuário removido com sucesso.' });
    });
  });
});

describe('UpdateUserDto', () => {
  const check = (o: object) =>
    validate(plainToInstance(UpdateUserDto, o) as object);

  it('permite atualizar apenas o nome', async () => {
    expect(await check({ name: 'Novo Nome' })).toHaveLength(0);
  });

  it('permite atualizar apenas o email', async () => {
    expect(await check({ email: 'novo@email.com' })).toHaveLength(0);
  });

  it('email inválido falha', async () => {
    expect(await check({ email: 'invalido' })).not.toHaveLength(0);
  });

  it('phone com mais de 20 caracteres falha', async () => {
    expect(await check({ phone: '1'.repeat(21) })).not.toHaveLength(0);
  });
});
