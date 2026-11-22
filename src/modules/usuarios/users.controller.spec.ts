import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController (Login and Activity History)', () => {
  let controller: UsersController;
  let service: jest.Mocked<Partial<UsersService>>;

  beforeEach(async () => {
    service = {
      registerLogin: jest.fn(),
      registerActivity: jest.fn(),
      getActivityHistory: jest.fn(),
      getLoginHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('deve registrar login via POST :id/login', async () => {
    const expected = { id: 'log-1', type: 'LOGIN' };
    (service.registerLogin as jest.Mock).mockResolvedValue(expected);

    const result = await controller.registerLogin('user-1', {
      ipAddress: '127.0.0.1',
    });

    expect(service.registerLogin).toHaveBeenCalledWith('user-1', {
      ipAddress: '127.0.0.1',
    });
    expect(result).toEqual(expected);
  });

  it('deve consultar histórico de atividades via GET :id/activities', async () => {
    const expected = { userId: 'user-1', total: 1, activities: [] };
    (service.getActivityHistory as jest.Mock).mockResolvedValue(expected);

    const result = await controller.getActivityHistory('user-1', {});

    expect(service.getActivityHistory).toHaveBeenCalledWith('user-1', {});
    expect(result).toEqual(expected);
  });

  it('deve consultar histórico de logins via GET :id/login-history', async () => {
    const expected = { userId: 'user-1', total: 1, activities: [] };
    (service.getLoginHistory as jest.Mock).mockResolvedValue(expected);

    const result = await controller.getLoginHistory('user-1', {});

    expect(service.getLoginHistory).toHaveBeenCalledWith('user-1', {});
    expect(result).toEqual(expected);
  });
});
