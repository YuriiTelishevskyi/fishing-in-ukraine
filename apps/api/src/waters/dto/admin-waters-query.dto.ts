import { WATER_STATUSES, WaterStatus } from '@fishing/shared';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminWatersQueryDto {
  @IsOptional()
  @IsIn(WATER_STATUSES)
  status?: WaterStatus;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  perPage: number = 20;
}
