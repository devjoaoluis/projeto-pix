import { IsOptional, IsString } from 'class-validator';

export class SuspendPixKeyDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

