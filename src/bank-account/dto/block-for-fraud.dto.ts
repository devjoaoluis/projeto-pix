import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BlockForFraudDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}