import { Controller, Get, Param, Query } from '@nestjs/common';
import { LangQueryDto } from '../common/lang-query.dto';
import { DictionariesService } from './dictionaries.service';

@Controller()
export class DictionariesController {
  constructor(private readonly dictionaries: DictionariesService) {}

  @Get('regions')
  regions(@Query() q: LangQueryDto) {
    return this.dictionaries.regions(q.lang);
  }

  @Get('fish-species')
  fishSpecies(@Query() q: LangQueryDto) {
    return this.dictionaries.fishSpecies(q.lang);
  }

  @Get('fish-species/:slug/regions')
  fishSpeciesRegions(@Param('slug') slug: string, @Query() q: LangQueryDto) {
    return this.dictionaries.fishSpeciesRegions(slug, q.lang);
  }

  @Get('rivers')
  rivers(@Query() q: LangQueryDto) {
    return this.dictionaries.rivers(q.lang);
  }

  @Get('amenities')
  amenities(@Query() q: LangQueryDto) {
    return this.dictionaries.amenities(q.lang);
  }
}
