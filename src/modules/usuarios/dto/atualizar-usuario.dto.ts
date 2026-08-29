import { IsOptional, IsString, IsEmail, Length, Matches } from 'class-validator';

export class AtualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @Length(3, 100)
  nome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve ter 10 ou 11 dígitos' })
  telefone?: string;
}