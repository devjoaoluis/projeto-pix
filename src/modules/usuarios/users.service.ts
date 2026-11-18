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
    // Passa o objeto simples com os atributos em inglês esperados pelo repositório
    try {
      return await this.usersRepository.create({
        name: dto.name,
        cpf: dto.cpf,
        email: dto.email,
        phone: dto.phone,
      });
    } catch (e: any) {
      // drizzle embrulha o erro do pg em DrizzleQueryError (code em e.cause)
      if ((e?.cause?.code ?? e?.code) === '23505') {
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

    return user;
  }

  async findAll() {
    return await this.usersRepository.findAll();
  }
}
