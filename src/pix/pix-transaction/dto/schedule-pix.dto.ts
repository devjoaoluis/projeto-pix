import { IsDateString } from 'class-validator';
import { TransferPixDto } from './transfer-pix.dto';

export class SchedulePixDto extends TransferPixDto {
  @IsDateString()
  scheduledAt: string;
}
