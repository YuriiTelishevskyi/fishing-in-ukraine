import { Locale, LOCALES } from '@fishing/shared';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ArticlesQueryDto {
  @IsOptional()
  @IsIn(LOCALES)
  lang: Locale = 'uk';

  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  perPage: number = 12;
}
