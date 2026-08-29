import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class GeneratePixDto {
  @IsString({ message: 'O planId deve ser uma string válida.' })
  @IsNotEmpty({ message: 'O planId é obrigatório.' })
  planId: string;

  @IsNumber({}, { message: 'O amount deve ser um número.' })
  @IsPositive({ message: 'O amount deve ser maior que zero.' })
  amount: number;
}
