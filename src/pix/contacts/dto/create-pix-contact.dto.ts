import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePixContactDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do contato é obrigatório' })
  name: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  pixKey?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  cpf?: string;
}
