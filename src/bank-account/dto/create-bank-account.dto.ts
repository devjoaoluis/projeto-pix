import { IsUUID } from 'class-validator';

export class CreateBankAccountDto {
  @IsUUID()
  userId: string;
}
