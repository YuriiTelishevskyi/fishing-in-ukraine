import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSpotDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  authorName!: string;

  @IsOptional()
  @IsEmail()
  authorEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  comment!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fishNote?: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  lat!: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  lng!: number;

  /** Honeypot field — whitelisted to avoid 400, but logic rejects non-empty values */
  @IsOptional()
  @IsString()
  website?: string;
}
