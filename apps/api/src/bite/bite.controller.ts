import { Controller, Get, Query } from '@nestjs/common';
import { CoordsQueryDto } from '../common/coords-query.dto';
import { BiteForecastService } from './bite-forecast.service';

@Controller('bite-forecast')
export class BiteController {
  constructor(private readonly biteForecast: BiteForecastService) {}

  @Get()
  get(@Query() q: CoordsQueryDto) {
    return this.biteForecast.getForecast(q.lat, q.lng);
  }
}
