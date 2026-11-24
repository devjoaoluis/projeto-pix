import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

// Localização é opcional, mas latitude e longitude só valem em par.
const hasLocation = (dto: TransferPixDto) =>
  dto.latitude != null || dto.longitude != null;

export class TransferPixDto {
  @IsString()
  pixKey: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ValidateIf(hasLocation)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ValidateIf(hasLocation)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
