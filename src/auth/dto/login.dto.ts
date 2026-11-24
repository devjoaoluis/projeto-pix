import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ValidateIf((o: LoginDto) => !o.cpf)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown),
  )
  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  email?: string;

  @ValidateIf((o: LoginDto) => !o.email)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : (value as unknown),
  )
  @IsString({ message: 'O CPF deve ser uma string.' })
  @IsNotEmpty({ message: 'Informe o e-mail ou CPF para autenticação.' })
  cpf?: string;

  @IsString({ message: 'A senha deve ser uma string.' })
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  device?: string;
}
