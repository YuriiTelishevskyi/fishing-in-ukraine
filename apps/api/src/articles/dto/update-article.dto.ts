import { PartialType } from '@nestjs/mapped-types';
import { ArticleStatus } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';
import { CreateArticleDto } from './create-article.dto';

export class UpdateArticleDto extends PartialType(CreateArticleDto) {
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: ArticleStatus;
}
