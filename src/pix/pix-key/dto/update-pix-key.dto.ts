import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { IsPixKey } from '../../decorators/is-pix-key.validator';
import { PixKeyStatus } from '../enums/pix-key-status.enum';

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

  @IsOptional()
  @IsEnum(PixKeyStatus)
  status?: PixKeyStatus;
}
