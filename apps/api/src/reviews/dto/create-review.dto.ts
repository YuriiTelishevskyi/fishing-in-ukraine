import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, Max, MinLength } from 'class-validator';

export class CreateReviewDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  authorName!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  text!: string;

  /** Honeypot field — must be whitelisted to avoid 400, but logic rejects non-empty values */
  @IsOptional()
  @IsString()
  website?: string;
}
