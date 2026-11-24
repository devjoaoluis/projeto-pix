import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreatePixDto {
  @IsUUID('all', { message: 'O bankAccountId deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O bankAccountId é obrigatório.' })
  bankAccountId: string;

  @IsNumber({}, { message: 'O amount deve ser um número.' })
  @IsPositive({ message: 'O amount deve ser maior que zero.' })
  amount: number;

  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string;
}
