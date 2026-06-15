import { Controller, Get, Param, Query } from '@nestjs/common';
import { LangQueryDto } from '../common/lang-query.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { WatersQueryDto } from './dto/waters-query.dto';
import { WatersService } from './waters.service';

@Controller('waters')
export class WatersController {
  constructor(private readonly waters: WatersService) {}

  @Get()
  list(@Query() query: WatersQueryDto) {
    return this.waters.list(query);
  }

  @Get('map')
  mapPins(@Query() query: WatersQueryDto) {
    return this.waters.mapPins(query);
  }

  @Get('nearby')
  nearby(@Query() q: NearbyQueryDto) {
    return this.waters.nearby(q);
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string, @Query() q: LangQueryDto) {
    return this.waters.bySlug(slug, q.lang);
  }
}
