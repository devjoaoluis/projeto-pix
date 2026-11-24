/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

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

describe('UsersService.remove', () => {
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
      remove: jest.fn(),
    };
    service = new UsersService(repo);
  });

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
