import { Injectable } from '@nestjs/common';

export interface OpenMeteoRaw {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    surface_pressure: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  hourly: {
    time: string[];
    pressure_msl: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    wind_speed_10m_max: number[];
    precipitation_sum: number[];
  };
}

interface CacheEntry {
  at: number;
  data: OpenMeteoRaw | null;
}

export interface ForecastResult {
  data: OpenMeteoRaw | null;
  fetchedAt: number;
}

const SUCCESS_TTL = 30 * 60 * 1000; // 30 min
const FAILURE_TTL = 60 * 1000; // 60 s

@Injectable()
export class OpenMeteoService {
  private readonly cache = new Map<string, CacheEntry>();

  async fetchForecast(lat: number, lng: number): Promise<ForecastResult> {
    const key = `${lat.toFixed(2)}|${lng.toFixed(2)}`;
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached) {
      const ttl = cached.data === null ? FAILURE_TTL : SUCCESS_TTL;
      if (now - cached.at < ttl) {
        return { data: cached.data, fetchedAt: cached.at };
      }
    }

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,pressure_msl,wind_speed_10m,wind_direction_10m` +
      `&hourly=pressure_msl` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,wind_speed_10m_max,precipitation_sum` +
      `&timezone=auto` +
      `&forecast_days=7`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) {
        this.cache.set(key, { at: now, data: null });
        return { data: null, fetchedAt: now };
      }
      const data = (await res.json()) as OpenMeteoRaw;
      this.cache.set(key, { at: now, data });
      return { data, fetchedAt: now };
    } catch {
      this.cache.set(key, { at: now, data: null });
      return { data: null, fetchedAt: now };
    }
  }
}
