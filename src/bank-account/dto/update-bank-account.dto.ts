import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyLimit?: number;
}
