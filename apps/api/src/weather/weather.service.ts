import { Injectable } from '@nestjs/common';
import { PressureTrend, WeatherCurrentDto, WeatherDailyDto, WeatherDto, WindDir } from '@fishing/shared';
import { ForecastResult, OpenMeteoRaw, OpenMeteoService } from './open-meteo.service';

function round(n: number): number {
  return Math.round(n);
}

function degToDir(deg: number): WindDir {
  const dirs: WindDir[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function computeTrend(hourly: OpenMeteoRaw['hourly']): PressureTrend {
  const pressures = hourly.pressure_msl;
  const times = hourly.time;
  if (!pressures || pressures.length < 6) return 'steady';

  // Find the index of the current hour
  const now = new Date();
  const nowHour = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
  ).toISOString().slice(0, 13);

  let currentIdx = -1;
  for (let i = 0; i < times.length; i++) {
    if (times[i].startsWith(nowHour)) {
      currentIdx = i;
      break;
    }
  }

  // Fall back to using the last available entries
  const endIdx = currentIdx >= 0 ? currentIdx + 1 : pressures.length;
  const startIdx = Math.max(0, endIdx - 6);
  const window = pressures.slice(startIdx, endIdx);

  if (window.length < 6) return 'steady';

  const recent = window.slice(3, 6);
  const earlier = window.slice(0, 3);
  const avgRecent = recent.reduce((s, v) => s + v, 0) / recent.length;
  const avgEarlier = earlier.reduce((s, v) => s + v, 0) / earlier.length;
  const diff = avgRecent - avgEarlier;

  if (diff > 0.8) return 'rising';
  if (diff < -0.8) return 'falling';
  return 'steady';
}

function toWeatherDto(result: ForecastResult): WeatherDto {
  const { data: raw, fetchedAt } = result;

  if (!raw) {
    return { available: false, current: null, daily: [], updatedAt: null };
  }

  const c = raw.current;
  // Sea-level pressure (pressure_msl) — the familiar "atmospheric pressure" anglers
  // reference (~745–765 mmHg), not the elevation-reduced surface_pressure.
  const pressureHpa = round(c.pressure_msl);
  const pressureMmHg = round(c.pressure_msl * 0.750062);
  const windDeg = round(c.wind_direction_10m);

  const current: WeatherCurrentDto = {
    tempC: round(c.temperature_2m),
    feelsC: round(c.apparent_temperature),
    humidity: round(c.relative_humidity_2m),
    precipMm: c.precipitation,
    weatherCode: c.weather_code,
    pressureHpa,
    pressureMmHg,
    pressureTrend: computeTrend(raw.hourly),
    windKmh: round(c.wind_speed_10m),
    windDeg,
    windDir: degToDir(windDeg),
  };

  const daily: WeatherDailyDto[] = raw.daily.time.slice(0, 7).map((date, i) => ({
    date,
    weatherCode: raw.daily.weather_code[i],
    tMax: round(raw.daily.temperature_2m_max[i]),
    tMin: round(raw.daily.temperature_2m_min[i]),
    sunrise: raw.daily.sunrise[i],
    sunset: raw.daily.sunset[i],
  }));

  return {
    available: true,
    current,
    daily,
    updatedAt: new Date(fetchedAt).toISOString(),
  };
}

@Injectable()
export class WeatherService {
  constructor(private readonly openMeteo: OpenMeteoService) {}

  async getWeather(lat: number, lng: number): Promise<WeatherDto> {
    const result = await this.openMeteo.fetchForecast(lat, lng);
    return toWeatherDto(result);
  }
}
