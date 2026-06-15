import { IsInt, IsOptional, Min } from 'class-validator';
import { LangQueryDto } from '../../common/lang-query.dto';

export class CatchReportsQueryDto extends LangQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;
}
