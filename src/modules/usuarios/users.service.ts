import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { hashPassword } from '../../auth/password.util';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { FilterActivityLogsDto } from './dto/filter-activity-logs.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export function sanitizeUser<T>(user: T): Omit<T, 'passwordHash'> {
  if (!user || typeof user !== 'object' || !('passwordHash' in user)) {
    return user as Omit<T, 'passwordHash'>;
  }
  const copy = { ...(user as Record<string, unknown>) };
  delete copy.passwordHash;
  return copy as Omit<T, 'passwordHash'>;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto) {
    try {
      const created = await this.usersRepository.create({
        name: dto.name,
        cpf: dto.cpf,
        email: dto.email,
        phone: dto.phone,
        ...(dto.password ? { passwordHash: hashPassword(dto.password) } : {}),
      });
      return sanitizeUser(created);
    } catch (e: any) {
      if (((e as { cause?: { code?: string }; code?: string })?.cause?.code ?? (e as { code?: string })?.code) === '23505') {
        throw new BadRequestException(
          'Já existe um usuário cadastrado com este CPF.',
        );
      }
      throw e;
    }
  }

  async findById(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return sanitizeUser(user);
  }

  async findAll(pagination?: PaginationQueryDto) {
    const all = await this.usersRepository.findAll(pagination);
    return Array.isArray(all) ? all.map((u) => sanitizeUser(u)) : all;
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

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);

    const name = dto.name ?? dto.nome;
    const phone = dto.phone ?? dto.telefone;
    const email = dto.email;

    const updatePayload: Partial<{
      name: string;
      email: string;
      phone: string;
    }> = {};
    if (name !== undefined) updatePayload.name = name.trim();
    if (email !== undefined) updatePayload.email = email.trim();
    if (phone !== undefined) updatePayload.phone = phone.trim();

    if (Object.keys(updatePayload).length === 0) {
      return await this.findById(id);
    }

    try {
      const updated = await this.usersRepository.update(id, updatePayload);
      return sanitizeUser(updated);
    } catch (e: any) {
      if (((e as { cause?: { code?: string }; code?: string })?.cause?.code ?? (e as { code?: string })?.code) === '23505') {
        throw new BadRequestException(
          'Já existe um usuário cadastrado com estes dados.',
        );
      }
      throw e;
    }
  }

  async remove(id: string) {
    await this.findById(id);
    await this.usersRepository.remove(id);
    return { message: 'Usuário removido com sucesso.' };
  }
}
