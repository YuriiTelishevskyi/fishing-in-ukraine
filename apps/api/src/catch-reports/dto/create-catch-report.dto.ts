import { Transform } from 'class-transformer';
import { IsDateString, IsEmail, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCatchReportDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  authorName!: string;

  @IsOptional()
  @IsEmail()
  authorEmail?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  fishId!: number;

  @IsDateString()
  caughtAt!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  comment?: string;

  /** Honeypot — whitelisted to avoid 400, but the service rejects non-empty values. */
  @IsOptional()
  @IsString()
  website?: string;
}
