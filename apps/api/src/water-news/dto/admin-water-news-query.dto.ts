import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminWaterNewsQueryDto {
  @IsOptional()
  @IsString()
  waterId?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  perPage?: number = 20;
}
