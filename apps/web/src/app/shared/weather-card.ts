import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { WeatherDto, PressureTrend, WindDir } from '@fishing/shared';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-weather-card',
  imports: [TranslocoPipe],
  templateUrl: './weather-card.html',
  styleUrl: './weather-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherCard {
  private readonly locale = inject(LocaleService);

  weather = input.required<WeatherDto>();

  wmoIcon(code: number): string {
    if (code === 0) return '☀️';
    if (code >= 1 && code <= 2) return '⛅️';
    if (code === 3) return '☁️';
    if (code === 45 || code === 48) return '🌫️';
    if (code >= 51 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 95 && code <= 99) return '⛈️';
    return '⛅️';
  }

  wmoLabelKey(code: number): string {
    if (code === 0) return 'wmo.clear';
    if (code >= 1 && code <= 2) return 'wmo.partly';
    if (code === 3) return 'wmo.cloudy';
    if (code === 45 || code === 48) return 'wmo.fog';
    if (code >= 51 && code <= 67) return 'wmo.rain';
    if (code >= 71 && code <= 77) return 'wmo.snow';
    if (code >= 80 && code <= 82) return 'wmo.showers';
    if (code >= 95 && code <= 99) return 'wmo.thunder';
    return 'wmo.partly';
  }

  trendArrow(trend: PressureTrend): string {
    if (trend === 'rising') return '↑';
    if (trend === 'falling') return '↓';
    return '→';
  }

  trendClass(trend: PressureTrend): string {
    if (trend === 'rising') return 'trend--rising';
    if (trend === 'falling') return 'trend--falling';
    return 'trend--steady';
  }

  windDirKey(dir: WindDir): string {
    return 'winddir.' + dir;
  }

  weekday(dateStr: string): string {
    const localeStr = this.locale.locale() === 'en' ? 'en-US' : 'uk-UA';
    return new Date(dateStr).toLocaleDateString(localeStr, { weekday: 'short' });
  }
}
