import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { IsCPF } from 'brazilian-class-validator'; 

export class CreateUserDto {
  @IsString({ message: 'O nome deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  name!: string;

  @IsCPF({ message: 'O CPF fornecido é inválido.' })
  @IsNotEmpty({ message: 'O CPF é obrigatório.' })
  cpf!: string;

  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email!: string;

  @IsString({ message: 'O telefone deve ser uma string.' })
  @IsNotEmpty({ message: 'O telefone é obrigatório.' })
  phone!: string;
}