import { Controller, Get, Param, Query } from '@nestjs/common';
import { WaterNewsService } from './water-news.service';
import { LangQueryDto } from '../common/lang-query.dto';

@Controller('waters/:slug/news')
export class WaterNewsController {
  constructor(private readonly waterNewsService: WaterNewsService) {}

  @Get()
  list(@Param('slug') slug: string, @Query() q: LangQueryDto) {
    return this.waterNewsService.listForWater(slug, q.lang ?? 'uk');
  }
}
