import { IsString, MaxLength, MinLength } from 'class-validator';
import { CreateUserDto } from '../../modules/usuarios/dto/create-user.dto';

export class RegisterDto extends CreateUserDto {
  @IsString({ message: 'A senha deve ser uma string.' })
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  @MaxLength(128, { message: 'A senha deve ter no máximo 128 caracteres.' })
  declare password: string;
}
