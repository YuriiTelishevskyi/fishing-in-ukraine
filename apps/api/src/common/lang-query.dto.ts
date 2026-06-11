import { Locale, LOCALES } from '@fishing/shared';
import { IsIn, IsOptional } from 'class-validator';

export class LangQueryDto {
  @IsOptional()
  @IsIn(LOCALES)
  lang: Locale = 'uk';
}
