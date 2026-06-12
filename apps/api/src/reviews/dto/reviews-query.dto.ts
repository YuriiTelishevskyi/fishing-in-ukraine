import { LangQueryDto } from '../../common/lang-query.dto';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ReviewsQueryDto extends LangQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;
}
