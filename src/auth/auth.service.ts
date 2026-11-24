import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { hashPassword, verifyPassword } from './password.util';
import { JwtTokenService } from './jwt-token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersRepository } from '../modules/usuarios/users.repository';
import { sanitizeUser } from '../modules/usuarios/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async register(dto: RegisterDto) {
    const existingByEmail = await this.usersRepository.findByEmail(dto.email);
    if (existingByEmail) {
      throw new BadRequestException(
        'Já existe um usuário cadastrado com este e-mail.',
      );
    }

    try {
      const created = await this.usersRepository.create({
        name: dto.name,
        cpf: dto.cpf,
        email: dto.email,
        phone: dto.phone,
        passwordHash: hashPassword(dto.password),
        role: 'USER',
      });

      const expiresIn = this.jwtTokenService.getExpiresInSeconds();
      const accessToken = this.jwtTokenService.sign({
        sub: created.id,
        email: created.email,
        role: created.role,
      });

      return {
        accessToken,
        tokenType: 'Bearer',
        expiresIn,
        user: sanitizeUser(created),
      };
    } catch (e: unknown) {
      const code =
        (e as { cause?: { code?: string }; code?: string })?.cause?.code ??
        (e as { code?: string })?.code;
      if (code === '23505') {
        throw new BadRequestException(
          'Já existe um usuário cadastrado com este CPF ou e-mail.',
        );
      }
      throw e;
    }
  }

  async login(dto: LoginDto, ipAddress?: string) {
    if (!dto.email && !dto.cpf) {
      throw new BadRequestException('Informe o e-mail ou CPF para login.');
    }

    const user = dto.cpf
      ? await this.usersRepository.findByCpf(dto.cpf)
      : await this.usersRepository.findByEmail(dto.email!);

    if (
      !user ||
      !user.passwordHash ||
      !verifyPassword(dto.password, user.passwordHash)
    ) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    await this.usersRepository.createActivityLog({
      userId: user.id,
      type: 'LOGIN',
      description: 'Login autenticado via JWT realizado com sucesso',
      ipAddress,
      device: dto.device,
    });

    const expiresIn = this.jwtTokenService.getExpiresInSeconds();
    const accessToken = this.jwtTokenService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: sanitizeUser(user),
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuário autenticado não encontrado.');
    }
    return sanitizeUser(user);
  }
}
