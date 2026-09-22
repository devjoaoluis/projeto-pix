import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';

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

    // Passa o objeto simples com os atributos em inglês esperados pelo repositório
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
}
