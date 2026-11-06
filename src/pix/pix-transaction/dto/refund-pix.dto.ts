import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class RefundPixDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'O valor do estorno deve ser positivo' })
  amount?: number;
}
