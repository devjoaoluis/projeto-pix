import { PartialType } from '@nestjs/mapped-types';
import { CreatePixDto } from './create-pix.dto';
import { IsEnum, IsOptional } from 'class-validator';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export class UpdatePixDto extends PartialType(CreatePixDto) {
  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Status de pagamento inválido.' })
  status?: PaymentStatus;
}
