import { Controller, Get, Param, Query } from '@nestjs/common';
import { LangQueryDto } from '../common/lang-query.dto';
import { ArticlesService } from './articles.service';
import { ArticlesQueryDto } from './dto/articles-query.dto';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  list(@Query() query: ArticlesQueryDto) {
    return this.articles.list(query);
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string, @Query() q: LangQueryDto) {
    return this.articles.bySlug(slug, q.lang);
  }
}
