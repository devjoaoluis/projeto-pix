import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { IsPixKey } from '../../decorators/is-pix-key.validator';

export class UpdatePixKeyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsPixKey()
  key?: string;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @IsOptional()
  @IsUUID()
  newBankAccountId?: string;
}

