import { IsNumber } from 'class-validator';

export class UpdateBalanceDto {
  @IsNumber()
  amount!: number;
}