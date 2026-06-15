import { Transform } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

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

  // Date-only (yyyy-mm-dd). Restricting the format keeps the @db.Date column and the
  // mapper's toISOString().slice(0,10) round-trip stable, and makes the range check
  // in the service a sound calendar-date comparison rather than an instant comparison.
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Дата вилову має бути у форматі РРРР-ММ-ДД' })
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
