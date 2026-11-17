import { IsString, IsNumber, IsPositive, IsOptional, IsUUID } from 'class-validator';

export class TransferPixDto {
  @IsString()
  pixKey: string; 

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string; 
}
