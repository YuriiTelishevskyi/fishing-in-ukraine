import { Injectable } from '@nestjs/common';
import { BiteDayDto, BiteForecastDto, BiteFactors, MoonPhaseDto } from '@fishing/shared';
import { OpenMeteoService } from '../weather/open-meteo.service';
import { moonPhase, moonNameKey } from './moon';

/**
 * Linear ramp helper: returns 1 inside [lo,hi], linearly falls to 0 at edgeLo and edgeHi.
 * Values below edgeLo or above edgeHi return 0.
 */
function band(v: number, lo: number, hi: number, edgeLo: number, edgeHi: number): number {
  if (v <= edgeLo || v >= edgeHi) return 0;
  if (v >= lo && v <= hi) return 1;
  if (v < lo) return (v - edgeLo) / (lo - edgeLo);
  // v > hi
  return (edgeHi - v) / (edgeHi - hi);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

@Injectable()
export class BiteForecastService {
  constructor(private readonly openMeteo: OpenMeteoService) {}

  async getForecast(lat: number, lng: number): Promise<BiteForecastDto> {
    const result = await this.openMeteo.fetchForecast(lat, lng);
    const { data: raw, fetchedAt } = result;

    if (!raw) {
      return { available: false, days: [], updatedAt: null };
    }

    const daily = raw.daily;
    const hourly = raw.hourly;

    const days: BiteDayDto[] = [];

    for (let i = 0; i < 7; i++) {
      const date = daily.time[i];

      // --- temp factor ---
      const mid = (daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2;
      // best [12,20], ramp to 0 at <=0 and >=30
      const tempFactor = band(mid, 12, 20, 0, 30);

      // --- wind factor ---
      const w = daily.wind_speed_10m_max[i];
      // best <=15 → 1, linear to 0 at >=40
      const windFactor = clamp(w <= 15 ? 1 : (40 - w) / (40 - 15), 0, 1);

      // --- precip factor ---
      const pr = daily.precipitation_sum[i];
      const wcode = daily.weather_code[i];
      let precipFactor: number;
      const lightRainCodes = new Set([2, 3, 45, 48, 51, 53]);
      const heavyCodes = new Set([95, 96, 99]);
      if (pr > 10 || heavyCodes.has(wcode)) {
        precipFactor = 0.1;
      } else if (pr >= 0.1 && pr <= 4 || lightRainCodes.has(wcode)) {
        precipFactor = 1.0;
      } else {
        // 0mm or clear codes (0/1)
        precipFactor = 0.6;
      }

      // --- pressure factor ---
      // Slice hourly pressure for this calendar day (match date prefix)
      const dayMsl: number[] = [];
      for (let h = 0; h < hourly.time.length; h++) {
        if (hourly.time[h].startsWith(date)) {
          dayMsl.push(hourly.pressure_msl[h]);
        }
      }

      let pressureFactor: number;
      if (dayMsl.length >= 2) {
        const dayChange = dayMsl[dayMsl.length - 1] - dayMsl[0];
        if (Math.abs(dayChange) < 2) {
          pressureFactor = 1.0; // stable
        } else if (dayChange >= -5 && dayChange <= -2) {
          pressureFactor = 0.8; // slowly falling — pre-front feeding
        } else if (Math.abs(dayChange) > 6) {
          pressureFactor = 0.2; // sharp change
        } else {
          // moderate change (2..6 or -5..-2 approximately)
          pressureFactor = 0.6;
        }
      } else {
        pressureFactor = 0.6; // missing — neutral
      }

      // --- moon factor ---
      const dateObj = new Date(date + 'T12:00:00Z');
      const moon = moonPhase(dateObj);
      // closeness to new (phase~0) or full (phase~0.5)
      const distToNew = Math.min(moon.phase, 1 - moon.phase); // 0 at new, 0.5 at full
      const distToFull = Math.abs(moon.phase - 0.5);           // 0 at full, 0.5 at new
      const closenessToNew = clamp(1 - distToNew / 0.25, 0, 1);
      const closenessToFull = clamp(1 - distToFull / 0.25, 0, 1);
      const moonFactor = 0.6 + 0.4 * Math.max(closenessToNew, closenessToFull);

      // --- weighted score ---
      const factors: BiteFactors = {
        pressure: pressureFactor,
        wind: windFactor,
        temp: tempFactor,
        precip: precipFactor,
        moon: moonFactor,
      };

      const weighted =
        pressureFactor * 0.35 +
        windFactor * 0.2 +
        tempFactor * 0.2 +
        precipFactor * 0.15 +
        moonFactor * 0.1;

      const score = clamp(Math.round(weighted * 5), 0, 5);

      let reasonKey: string;
      if (score >= 4) reasonKey = 'bite.reason.great';
      else if (score >= 3) reasonKey = 'bite.reason.good';
      else if (score >= 2) reasonKey = 'bite.reason.fair';
      else reasonKey = 'bite.reason.poor';

      const moonDto: MoonPhaseDto = {
        phase: moon.phase,
        illumination: moon.illumination,
        nameKey: moonNameKey(moon.phase),
      };

      days.push({ date, score, factors, moon: moonDto, reasonKey });
    }

    return {
      available: true,
      days,
      updatedAt: new Date(fetchedAt).toISOString(),
    };
  }
}
