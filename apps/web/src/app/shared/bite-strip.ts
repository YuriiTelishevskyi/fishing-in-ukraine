import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BiteForecastDto } from '@fishing/shared';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-bite-strip',
  imports: [TranslocoPipe],
  templateUrl: './bite-strip.html',
  styleUrl: './bite-strip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteStrip {
  private readonly locale = inject(LocaleService);

  forecast = input.required<BiteForecastDto>();
  compact = input(false);

  moonIcon(nameKey: string): string {
    const map: Record<string, string> = {
      'moon.new': '🌑',
      'moon.waxingCrescent': '🌒',
      'moon.firstQuarter': '🌓',
      'moon.waxingGibbous': '🌔',
      'moon.full': '🌕',
      'moon.waningGibbous': '🌖',
      'moon.lastQuarter': '🌗',
      'moon.waningCrescent': '🌘',
    };
    return map[nameKey] ?? '🌙';
  }

  weekday(dateStr: string): string {
    const localeStr = this.locale.locale() === 'en' ? 'en-US' : 'uk-UA';
    return new Date(dateStr).toLocaleDateString(localeStr, { weekday: 'short' });
  }

  scoreArray(_score: number): number[] {
    return [0, 1, 2, 3, 4];
  }

  scoreClass(score: number): string {
    if (score >= 4) return 'bite-day--great';
    if (score >= 3) return 'bite-day--good';
    return 'bite-day--muted';
  }
}
