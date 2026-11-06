import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RegisterTransactionLocationDto {
  @IsOptional()
  @IsNumber()
  @Min(-90, { message: 'Latitude deve estar entre -90 e 90' })
  @Max(90, { message: 'Latitude deve estar entre -90 e 90' })
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180, { message: 'Longitude deve estar entre -180 e 180' })
  @Max(180, { message: 'Longitude deve estar entre -180 e 180' })
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  state?: string;
}
