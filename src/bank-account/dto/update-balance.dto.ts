import { IsNumber, IsPositive } from 'class-validator';

export class UpdateBalanceDto {
  @IsNumber()
  @IsPositive()
  amount: number;
}
