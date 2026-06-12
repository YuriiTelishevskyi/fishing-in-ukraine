import { ArticleStatus } from '@prisma/client';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminArticlesQueryDto {
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: ArticleStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  perPage: number = 20;
}
