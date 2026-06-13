import { WATER_TYPES, WaterType } from '@fishing/shared';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateWaterDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  description: string;

  @IsInt()
  regionId: number;

  @IsOptional()
  @IsString()
  district?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaHa?: number;

  @IsIn(WATER_TYPES)
  waterType: WaterType;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @IsDateString()
  premiumUntil?: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceFrom?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceTo?: number;

  @IsOptional()
  @IsString()
  priceNote?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  website?: string;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  rulesEn?: string;

  @IsOptional()
  @IsString()
  priceNoteEn?: string;

  @IsOptional()
  @IsString()
  seoTitleEn?: string;

  @IsOptional()
  @IsString()
  seoDescriptionEn?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  fishIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  amenityIds?: number[];
}
