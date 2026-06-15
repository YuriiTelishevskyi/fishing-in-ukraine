import { Controller, Get, Query } from '@nestjs/common';
import { CoordsQueryDto } from '../common/coords-query.dto';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  @Get()
  getWeather(@Query() q: CoordsQueryDto) {
    return this.weather.getWeather(q.lat, q.lng);
  }
}
