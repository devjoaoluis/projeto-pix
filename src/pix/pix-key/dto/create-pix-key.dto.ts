import { IsNotEmpty, IsString } from 'class-validator';
import { IsPixKey } from '../../decorators/is-pix-key.validator';


export class CreatePixKeyDto {
  @IsString()
  @IsNotEmpty()
  @IsPixKey()
  key: string;
}
