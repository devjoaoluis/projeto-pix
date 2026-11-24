import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';

// Substitui o brazilian-class-validator, que trazia um class-validator antigo e vulnerável.
@ValidatorConstraint({ name: 'isCpf' })
class IsCpfConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && cpfValidator.isValid(value);
  }
}

export class CreateUserDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString({ message: 'O nome deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MaxLength(255, { message: 'O nome deve ter no máximo 255 caracteres.' })
  name!: string;

  // Grava só os dígitos para que "529.982.247-25" e "52998224725" não burlem o unique.
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : (value as unknown),
  )
  @Validate(IsCpfConstraint, { message: 'O CPF fornecido é inválido.' })
  @IsNotEmpty({ message: 'O CPF é obrigatório.' })
  cpf!: string;

  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  @MaxLength(255, { message: 'O e-mail deve ter no máximo 255 caracteres.' })
  email!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString({ message: 'O telefone deve ser uma string.' })
  @IsNotEmpty({ message: 'O telefone é obrigatório.' })
  @MaxLength(20, { message: 'O telefone deve ter no máximo 20 caracteres.' })
  phone!: string;

  @IsOptional()
  @IsString({ message: 'A senha deve ser uma string.' })
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  @MaxLength(128, { message: 'A senha deve ter no máximo 128 caracteres.' })
  password?: string;
}
