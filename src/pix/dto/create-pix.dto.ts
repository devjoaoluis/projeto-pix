import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
} from 'class-validator';

export class CreatePixDto {
  @IsString({ message: 'O accountId deve ser uma string válida.' })
  @IsNotEmpty({ message: 'O accountId é obrigatório.' })
  accountId: string;

  @IsNumber({}, { message: 'O amount deve ser um número.' })
  @IsPositive({ message: 'O amount deve ser maior que zero.' })
  amount: number;

  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string;
}
