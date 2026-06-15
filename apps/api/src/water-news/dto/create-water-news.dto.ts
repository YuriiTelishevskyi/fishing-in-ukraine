import { IsString, IsOptional, IsIn, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateWaterNewsDto {
  @IsString()
  waterId: string;

  @IsIn(['STOCKING', 'NEWS'])
  type: 'STOCKING' | 'NEWS';

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  titleEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bodyEn?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;
}
