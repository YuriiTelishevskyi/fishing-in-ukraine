import { Module } from '@nestjs/common';
import { OpenMeteoService } from './open-meteo.service';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';

@Module({
  controllers: [WeatherController],
  providers: [OpenMeteoService, WeatherService],
  exports: [OpenMeteoService],
})
export class WeatherModule {}
