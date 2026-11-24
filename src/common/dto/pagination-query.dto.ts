import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit deve ser um número inteiro.' })
  @Min(1, { message: 'limit deve ser no mínimo 1.' })
  @Max(100, { message: 'limit deve ser no máximo 100.' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset deve ser um número inteiro.' })
  @Min(0, { message: 'offset não pode ser negativo.' })
  offset?: number;
}

export function resolvePagination(
  query?: PaginationQueryDto,
  defaultLimit = 50,
): { limit: number; offset: number } {
  const rawLimit = query?.limit ?? defaultLimit;
  const rawOffset = query?.offset ?? 0;
  const limit = Math.min(Math.max(1, Number(rawLimit) || defaultLimit), 100);
  const offset = Math.max(0, Number(rawOffset) || 0);
  return { limit, offset };
}
