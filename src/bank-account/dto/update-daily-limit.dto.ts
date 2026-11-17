import { IsNumber, Min } from 'class-validator';

export class UpdateDailyLimitDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  dailyLimit: number;
}
