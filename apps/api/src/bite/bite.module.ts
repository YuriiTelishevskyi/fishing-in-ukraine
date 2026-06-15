import { Module } from '@nestjs/common';
import { WeatherModule } from '../weather/weather.module';
import { BiteController } from './bite.controller';
import { BiteForecastService } from './bite-forecast.service';

@Module({
  imports: [WeatherModule],
  controllers: [BiteController],
  providers: [BiteForecastService],
})
export class BiteModule {}
