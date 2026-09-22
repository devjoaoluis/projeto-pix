import { IsDateString, IsNotEmpty } from 'class-validator';

export class ReportFilterDto {
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
