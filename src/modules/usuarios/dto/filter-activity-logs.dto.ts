import { IsDateString, IsOptional, IsString } from 'class-validator';

export class FilterActivityLogsDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

