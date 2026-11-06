import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService (Login and Activity History)', () => {
  let service: UsersService;
  let repository: jest.Mocked<Partial<UsersRepository>>;

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
      findByCpf: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      createActivityLog: jest.fn(),
      findActivitiesByUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('deve registrar login de um usuário existente', async () => {
    const user = { id: 'user-1', name: 'João' };
    const createdLog = {
      id: 'log-1',
      userId: 'user-1',
      type: 'LOGIN',
      description: 'Login realizado com sucesso',
      ipAddress: '192.168.0.1',
      device: 'Chrome Windows',
      createdAt: new Date(),
    };

    (repository.findById as jest.Mock).mockResolvedValue(user);
    (repository.createActivityLog as jest.Mock).mockResolvedValue(createdLog);

    const result = await service.registerLogin('user-1', {
      ipAddress: '192.168.0.1',
      device: 'Chrome Windows',
    });

    expect(result).toEqual(createdLog);
    expect(repository.createActivityLog).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'LOGIN',
      description: 'Login realizado com sucesso',
      ipAddress: '192.168.0.1',
      device: 'Chrome Windows',
    });
  });

  it('deve registrar uma atividade customizada do usuário', async () => {
    const user = { id: 'user-1', name: 'João' };
    const createdLog = {
      id: 'log-2',
      userId: 'user-1',
      type: 'KEY_CHANGE',
      description: 'Alterou chave PIX',
    };

    (repository.findById as jest.Mock).mockResolvedValue(user);
    (repository.createActivityLog as jest.Mock).mockResolvedValue(createdLog);

    const result = await service.registerActivity('user-1', {
      type: 'KEY_CHANGE',
      description: 'Alterou chave PIX',
    });

    expect(result).toEqual(createdLog);
  });

  it('deve consultar o histórico de atividades e logins do usuário', async () => {
    const user = { id: 'user-1', name: 'João' };
    const logs = [
      {
        id: 'log-1',
        type: 'LOGIN',
        description: 'Login realizado com sucesso',
      },
      {
        id: 'log-2',
        type: 'PIX_TRANSFER',
        description: 'Transferência enviada',
      },
    ];

    (repository.findById as jest.Mock).mockResolvedValue(user);
    (repository.findActivitiesByUser as jest.Mock).mockResolvedValue(logs);

    const result = await service.getActivityHistory('user-1');

    expect(result.userId).toBe('user-1');
    expect(result.total).toBe(2);
    expect(result.activities).toEqual(logs);
  });

  it('deve consultar especificamente o histórico de logins', async () => {
    const user = { id: 'user-1', name: 'João' };
    const loginLogs = [
      {
        id: 'log-1',
        type: 'LOGIN',
        description: 'Login realizado com sucesso',
      },
    ];

    (repository.findById as jest.Mock).mockResolvedValue(user);
    (repository.findActivitiesByUser as jest.Mock).mockResolvedValue(loginLogs);

    const result = await service.getLoginHistory('user-1');

    expect(repository.findActivitiesByUser).toHaveBeenCalledWith('user-1', {
      type: 'LOGIN',
    });
    expect(result.total).toBe(1);
  });

  it('deve lançar BadRequestException quando endDate < startDate na consulta de atividades', async () => {
    const user = { id: 'user-1', name: 'João' };
    (repository.findById as jest.Mock).mockResolvedValue(user);

    await expect(
      service.getActivityHistory('user-1', {
        startDate: '2026-09-15T00:00:00Z',
        endDate: '2026-09-01T00:00:00Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve lançar NotFoundException se o usuário não existir', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(null);

    await expect(service.getLoginHistory('user-inexistente')).rejects.toThrow(
      NotFoundException,
    );
  });
});
