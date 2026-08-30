import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class CriarUsuarioDto {
  @IsString({ message: 'O nome deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  nome!: string;

  @IsString({ message: 'O CPF deve ser uma string.' })
  @IsNotEmpty({ message: 'O CPF é obrigatório.' })
  @Length(11, 14, { message: 'O CPF deve ter entre 11 e 14 caracteres.' })
  cpf!: string;

  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email!: string;

  @IsString({ message: 'O telefone deve ser uma string.' })
  @IsNotEmpty({ message: 'O telefone é obrigatório.' })
  telefone!: string;
}