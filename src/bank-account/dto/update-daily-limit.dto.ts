import { IsNumber, Min } from 'class-validator';

export class UpdateDailyLimitDto {
  @IsNumber()
  @Min(0, { message: 'O limite diário não pode ser negativo' })
  dailyLimit: number;
}
