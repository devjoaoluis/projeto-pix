import { PartialType } from '@nestjs/mapped-types';
import { IsString } from 'class-validator';
import { CreateBankAccountDto } from './create-bank-account.dto';

export class UpdateBankAccountDto extends PartialType(CreateBankAccountDto) {
  @IsString()
  status: string;
}
