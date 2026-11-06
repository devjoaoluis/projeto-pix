import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { FilterActivityLogsDto } from './dto/filter-activity-logs.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto) {
    const userExists = await this.usersRepository.findByCpf(dto.cpf);

    if (userExists) {
      throw new BadRequestException(
        'Já existe um usuário cadastrado com este CPF.',
      );
    }

    return await this.usersRepository.create({
      name: dto.name,
      cpf: dto.cpf,
      email: dto.email,
      phone: dto.phone,
    });
  }

  async findById(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  async findAll() {
    return await this.usersRepository.findAll();
  }

  async registerLogin(userId: string, dto: CreateActivityLogDto = {}) {
    await this.findById(userId);

    return this.usersRepository.createActivityLog({
      userId,
      type: 'LOGIN',
      description: dto.description ?? 'Login realizado com sucesso',
      ipAddress: dto.ipAddress,
      device: dto.device,
    });
  }

  async registerActivity(userId: string, dto: CreateActivityLogDto) {
    await this.findById(userId);

    if (!dto.type && !dto.description) {
      throw new BadRequestException(
        'Informe o tipo (type) ou a descrição (description) da atividade',
      );
    }

    return this.usersRepository.createActivityLog({
      userId,
      type: dto.type ?? 'ACTIVITY',
      description: dto.description ?? 'Atividade registrada na conta',
      ipAddress: dto.ipAddress,
      device: dto.device,
    });
  }

  async getActivityHistory(
    userId: string,
    filterDto: FilterActivityLogsDto = {},
  ) {
    await this.findById(userId);

    if (filterDto.startDate && filterDto.endDate) {
      if (new Date(filterDto.endDate) < new Date(filterDto.startDate)) {
        throw new BadRequestException(
          'endDate não pode ser menor que startDate',
        );
      }
    }

    const activities = await this.usersRepository.findActivitiesByUser(
      userId,
      filterDto,
    );

    return {
      userId,
      total: activities.length,
      activities,
    };
  }

  async getLoginHistory(userId: string, filterDto: FilterActivityLogsDto = {}) {
    return this.getActivityHistory(userId, {
      ...filterDto,
      type: 'LOGIN',
    });
  }
}
