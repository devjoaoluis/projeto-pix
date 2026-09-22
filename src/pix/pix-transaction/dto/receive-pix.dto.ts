import { IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

export class ReceivePixDto {
  @IsString()
  pixKey: string; 

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  externalTransactionId: string; 
}
