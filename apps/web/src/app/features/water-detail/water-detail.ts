import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { BiteForecastDto, CatchReportDto, FishSpeciesDto, Paginated, ReviewDto, WaterDetailDto, WATER_TYPE_LABELS, WaterNewsDto, WaterType, WeatherDto } from '@fishing/shared';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { SITE_ORIGIN } from '../../core/site-origin';
import { usePageLocale } from '../../core/use-locale';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { BiteStrip } from '../../shared/bite-strip';
import { Breadcrumbs } from '../../shared/breadcrumbs';
import { createMapPin } from '../../shared/map-pin';
import { Pager } from '../../shared/pager';
import { StarRating } from '../../shared/star-rating';
import { WeatherCard } from '../../shared/weather-card';

const EN_TYPE_LABELS: Record<WaterType, string> = {
  LAKE: 'Lake',
  POND: 'Pond',
  RIVER: 'River',
  RESERVOIR: 'Reservoir',
  FISHING_COMPLEX: 'Fishing complex',
};

@Component({
  selector: 'app-water-detail',
  imports: [Header, Footer, TranslocoPipe, Breadcrumbs, NgOptimizedImage, RouterLink, FormsModule, Pager, StarRating, WeatherCard, BiteStrip],
  templateUrl: './water-detail.html',
  styleUrl: './water-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaterDetailPage {
  readonly locale = usePageLocale();
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly siteOrigin = inject(SITE_ORIGIN);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly injector = inject(Injector);

  readonly water = signal<WaterDetailDto | null>(null);
  readonly weather = signal<WeatherDto | null>(null);
  readonly bite = signal<BiteForecastDto | null>(null);
  readonly notFound = signal(false);
  readonly active = signal(0);
  readonly mapEl = viewChild<ElementRef<HTMLDivElement>>('miniMap');

  // Reviews state
  readonly reviews = signal<Paginated<ReviewDto> | null>(null);
  readonly reviewsPage = signal(1);
  readonly reviewsLoading = signal(false);

  // Form state
  readonly formName = signal('');
  readonly formRating = signal(0);
  readonly formText = signal('');
  readonly hpValue = signal('');
  readonly formPending = signal(false);
  readonly formSuccess = signal(false);
  readonly formError = signal<string | null>(null);

  // News & stocking state
  readonly news = signal<WaterNewsDto[]>([]);

  // Catch reports state
  readonly catches = signal<Paginated<CatchReportDto> | null>(null);
  readonly catchesPage = signal(1);
  readonly catchesLoading = signal(false);
  readonly fishOptions = signal<FishSpeciesDto[]>([]);
  readonly crFormOpen = signal(false);

  readonly crName = signal('');
  readonly crEmail = signal('');
  readonly crFishId = signal<number | null>(null);
  readonly crDate = signal(this.todayStr());
  // Cap the date picker at today, computed once (the field value must not move the max).
  readonly crMaxDate = this.todayStr();
  readonly crComment = signal('');
  readonly crFile = signal<File | null>(null);
  readonly crHp = signal('');
  readonly crPending = signal(false);
  readonly crSuccess = signal(false);
  readonly crError = signal<string | null>(null);

  private todayStr(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  readonly pair = this.locale.pathPair('catalog', [
    this.route.snapshot.paramMap.get('regionSlug')!,
    this.route.snapshot.paramMap.get('waterSlug')!,
  ]);

  readonly typeLabels = WATER_TYPE_LABELS;
  readonly enTypeLabels = EN_TYPE_LABELS;

  private readonly slug = this.route.snapshot.paramMap.get('waterSlug')!;
  private mounted = false;

  constructor() {
    this.api.water(this.slug).subscribe({
      next: (w) => {
        this.water.set(w);
        this.applySeo(w);
        this.loadReviews(1);
        this.loadCatches(1);
        this.api.waterNews(this.slug).subscribe((n) => this.news.set(n));
        this.api.fishSpecies().subscribe((f) => this.fishOptions.set(f));
        this.api.weather(w.lat, w.lng).subscribe({
          next: (wx) => this.weather.set(wx),
          error: () => this.weather.set({ available: false, current: null, daily: [], updatedAt: null }),
        });
        this.api.biteForecast(w.lat, w.lng).subscribe({
          next: (b) => this.bite.set(b),
          error: () => this.bite.set({ available: false, days: [], updatedAt: null }),
        });
      },
      error: () => this.notFound.set(true),
    });

    // effect() runs whenever water() changes (SSR-safe: isBrowser guard)
    effect(() => {
      const w = this.water();
      if (!w || !this.isBrowser || this.mounted) return;
      this.mounted = true; // set BEFORE scheduling so the effect never re-enters
      afterNextRender(() => this.mountMap(w), { injector: this.injector });
    });
  }

  private loadReviews(page: number): void {
    this.reviewsLoading.set(true);
    this.api.waterReviews(this.slug, page).subscribe({
      next: (r) => {
        this.reviews.set(r);
        this.reviewsPage.set(page);
        this.reviewsLoading.set(false);
      },
      error: () => this.reviewsLoading.set(false),
    });
  }

  onReviewPageChange(page: number): void {
    this.loadReviews(page);
  }

  private loadCatches(page: number): void {
    this.catchesLoading.set(true);
    this.api.waterCatchReports(this.slug, page).subscribe({
      next: (r) => { this.catches.set(r); this.catchesPage.set(page); this.catchesLoading.set(false); },
      error: () => this.catchesLoading.set(false),
    });
  }

  onCatchesPageChange(page: number): void { this.loadCatches(page); }

  onCrFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.crFile.set(input.files?.[0] ?? null);
  }

  get crValid(): boolean {
    const hasComment = this.crComment().trim().length > 0;
    const hasPhoto = !!this.crFile();
    return this.crName().trim().length >= 2 && this.crFishId() != null && !!this.crDate() && (hasComment || hasPhoto);
  }

  submitCatch(): void {
    if (!this.crValid || this.crPending()) return;
    this.crPending.set(true);
    this.crError.set(null);
    const fd = new FormData();
    fd.append('authorName', this.crName().trim());
    if (this.crEmail().trim()) fd.append('authorEmail', this.crEmail().trim());
    fd.append('fishId', String(this.crFishId()));
    fd.append('caughtAt', this.crDate());
    if (this.crComment().trim()) fd.append('comment', this.crComment().trim());
    if (this.crFile()) fd.append('photo', this.crFile() as File);
    if (this.crHp()) fd.append('website', this.crHp());
    this.api.submitCatchReport(this.slug, fd).subscribe({
      next: () => { this.crPending.set(false); this.crSuccess.set(true); },
      error: (err) => {
        this.crPending.set(false);
        const msg = err?.error?.message;
        this.crError.set(typeof msg === 'string' ? msg : (Array.isArray(msg) ? msg.join(', ') : null));
      },
    });
  }

  onStarChange(rating: number): void {
    this.formRating.set(rating);
  }

  get formValid(): boolean {
    return (
      this.formName().trim().length >= 2 &&
      this.formRating() >= 1 &&
      this.formText().trim().length >= 10
    );
  }

  submitReview(): void {
    if (!this.formValid || this.formPending()) return;
    this.formPending.set(true);
    this.formError.set(null);

    this.api.postReview(this.slug, {
      authorName: this.formName().trim(),
      rating: this.formRating(),
      text: this.formText().trim(),
      website: this.hpValue() || undefined,
    }).subscribe({
      next: () => {
        this.formPending.set(false);
        this.formSuccess.set(true);
      },
      error: (err) => {
        this.formPending.set(false);
        const msg = err?.error?.message;
        this.formError.set(typeof msg === 'string' ? msg : null);
      },
    });
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  private async mountMap(w: WaterDetailDto) {
    const el = this.mapEl()?.nativeElement;
    if (!el) return;
    const leaflet = await import('leaflet');
    const L = (leaflet as any).default ?? leaflet;
    const map = L.map(el, { scrollWheelZoom: false }).setView([w.lat, w.lng], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);
    L.marker([w.lat, w.lng], { icon: createMapPin(L) }).addTo(map);
  }

  typeLabel(type: WaterType): string {
    if (this.locale.locale() === 'en') {
      return this.enTypeLabels[type] ?? type;
    }
    return this.typeLabels[type] ?? type;
  }

  private applySeo(w: WaterDetailDto) {
    const isEn = this.locale.locale() === 'en';
    const name = isEn && w.nameEn ? w.nameEn : w.name;
    const description = isEn && w.descriptionEn ? w.descriptionEn : w.description;
    const seoTitle = isEn ? (w.seoTitleEn ?? w.seoTitle) : w.seoTitle;
    const seoDescription = isEn ? (w.seoDescriptionEn ?? w.seoDescription) : w.seoDescription;

    const localBusiness: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: w.name,
      description: w.description.slice(0, 300),
      telephone: w.phone ?? undefined,
      url: `${this.siteOrigin}${this.pair.uk}`,
      geo: { '@type': 'GeoCoordinates', latitude: w.lat, longitude: w.lng },
      address: { '@type': 'PostalAddress', addressRegion: w.regionName, addressCountry: 'UA' },
      image: w.media.map((m) => `${this.siteOrigin}${m.urlFull}`),
    };

    if (w.ratingCount > 0) {
      localBusiness['aggregateRating'] = {
        '@type': 'AggregateRating',
        ratingValue: w.ratingAvg,
        reviewCount: w.ratingCount,
      };
    }

    this.seo.apply({
      title: seoTitle ?? `${name} — ${w.regionName} | FishMap.ua`,
      description: seoDescription ?? description.slice(0, 155),
      paths: this.pair,
      locale: this.locale.locale(),
      image: w.media[0]?.urlCard ?? null,
      jsonLd: [localBusiness],
    });
  }
}
