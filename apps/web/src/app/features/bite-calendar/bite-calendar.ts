import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { BiteForecastDto, WaterListItemDto } from '@fishing/shared';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { SITE_ORIGIN } from '../../core/site-origin';
import { usePageLocale } from '../../core/use-locale';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { BiteStrip } from '../../shared/bite-strip';
import { Breadcrumbs } from '../../shared/breadcrumbs';
import { SearchableSelect, SelectOption } from '../../shared/searchable-select';

interface WaterOption {
  name: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-bite-calendar',
  imports: [Header, Footer, TranslocoPipe, BiteStrip, Breadcrumbs, SearchableSelect],
  templateUrl: './bite-calendar.html',
  styleUrl: './bite-calendar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteCalendarPage {
  readonly locale = usePageLocale();
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  private readonly siteOrigin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  readonly pair = this.locale.pathPair('biteCalendar');

  readonly watersList = toSignal(this.api.waters({ perPage: 100 }), { initialValue: null });
  readonly forecast = signal<BiteForecastDto | null>(null);
  readonly selectedIndex = signal(0);
  readonly geoError = signal<string | null>(null);
  readonly loadingForecast = signal(false);

  private defaultLoaded = false;

  private readonly coordsFromQuery: { lat: number; lng: number } | null;

  constructor() {
    this.applySeo();

    const qp = this.route.snapshot.queryParamMap;
    const lat = qp.get('lat');
    const lng = qp.get('lng');
    this.coordsFromQuery = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;

    // If query params provided, load forecast immediately
    if (this.coordsFromQuery) {
      this.loadForecast(this.coordsFromQuery.lat, this.coordsFromQuery.lng);
    }

    // When waters list loads and no query params, load default (first water)
    effect(() => {
      const list = this.watersList();
      if (!list || list.items.length === 0 || this.defaultLoaded || this.coordsFromQuery) return;
      this.defaultLoaded = true;
      const first = list.items[0];
      this.loadForecast(first.lat, first.lng);
    });
  }

  get waterOptions(): WaterOption[] {
    const list = this.watersList();
    if (!list) return [];
    return list.items.map((w: WaterListItemDto) => ({ name: w.name, lat: w.lat, lng: w.lng }));
  }

  get waterSelectOptions(): SelectOption[] {
    return this.waterOptions.map((w, index) => ({ label: w.name, value: index }));
  }

  onWaterPicked(index: number): void {
    this.selectedIndex.set(index);
    const opt = this.waterOptions[index];
    if (opt) {
      this.loadForecast(opt.lat, opt.lng);
    }
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.geoError.set('bite.geoDenied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.geoError.set(null);
        this.loadForecast(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        this.geoError.set('bite.geoDenied');
      },
    );
  }

  private loadForecast(lat: number, lng: number): void {
    this.loadingForecast.set(true);
    this.api.biteForecast(lat, lng).subscribe({
      next: (fc) => {
        this.forecast.set(fc);
        this.loadingForecast.set(false);
      },
      error: () => {
        this.forecast.set({ available: false, days: [], updatedAt: null });
        this.loadingForecast.set(false);
      },
    });
  }

  private applySeo(): void {
    const isEn = this.locale.locale() === 'en';
    this.seo.apply({
      title: isEn ? 'Bite calendar — FishMap.ua' : 'Календар кльову — FishMap.ua',
      description: isEn
        ? '7-day estimated fish-activity forecast for Ukrainian waters. Choose a water or use your location.'
        : 'Орієнтовний прогноз активності риби на 7 днів для водойм України. Оберіть водойму або використайте геолокацію.',
      paths: this.pair,
      locale: this.locale.locale(),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'FishMap.ua', item: `${this.siteOrigin}/` },
            {
              '@type': 'ListItem',
              position: 2,
              name: isEn ? 'Bite calendar' : 'Календар кльову',
              item: `${this.siteOrigin}${isEn ? this.pair.en : this.pair.uk}`,
            },
          ],
        },
      ],
    });
  }
}
