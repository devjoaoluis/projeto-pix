import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class SchedulePixDto {
  @IsString()
  @IsNotEmpty({ message: 'A chave PIX é obrigatória' })
  pixKey: string;

  @IsNumber()
  @IsPositive({ message: 'O valor deve ser positivo' })
  amount: number;

  @IsDateString({}, { message: 'scheduledFor deve ser uma data ISO válida' })
  scheduledFor: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
