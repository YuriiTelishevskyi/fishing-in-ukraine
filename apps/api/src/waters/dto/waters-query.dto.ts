import { WATER_TYPES, WaterType } from '@fishing/shared';
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { LangQueryDto } from '../../common/lang-query.dto';

export class WatersQueryDto extends LangQueryDto {
  @IsOptional()
  @IsString()
  region?: string;

  /** comma-separated fish slugs, matches waters having ANY of them */
  @IsOptional()
  @IsString()
  fish?: string;

  /** comma-separated amenity slugs, matches waters having ALL of them */
  @IsOptional()
  @IsString()
  amenities?: string;

  @IsOptional()
  @IsIn(WATER_TYPES)
  type?: WaterType;

  @IsOptional()
  @IsBooleanString()
  paid?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['popular'])
  sort?: string;

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
