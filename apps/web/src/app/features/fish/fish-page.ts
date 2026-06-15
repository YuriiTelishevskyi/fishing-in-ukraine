import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { FishRegionCountDto, Paginated, WaterListItemDto } from '@fishing/shared';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { SITE_ORIGIN } from '../../core/site-origin';
import { usePageLocale } from '../../core/use-locale';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { Pager } from '../../shared/pager';
import { WaterCard } from '../../shared/water-card';

@Component({
  selector: 'app-fish-page',
  imports: [Header, Footer, TranslocoPipe, WaterCard, Pager, RouterLink],
  templateUrl: './fish-page.html',
  styleUrl: './fish-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FishPage {
  readonly locale = usePageLocale();
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly slug = this.route.snapshot.paramMap.get('fishSlug')!;
  readonly pair = this.locale.pathPair('fish', [this.slug]);
  private readonly siteOrigin = inject(SITE_ORIGIN);

  readonly fishSpecies = toSignal(this.api.fishSpecies(), { initialValue: [] });
  readonly fishName = computed(() => this.fishSpecies().find((f) => f.slug === this.slug)?.name ?? '');
  readonly regions = signal<FishRegionCountDto[]>([]);

  readonly page = signal(1);
  readonly loading = signal(true);
  readonly items = signal<WaterListItemDto[]>([]);
  readonly total = signal(0);
  readonly perPage = 18;

  constructor() {
    this.loadPage(1);
    this.api.fishSpeciesRegions(this.slug).subscribe((r) => this.regions.set(r));

    // Re-apply SEO once fish name resolves (same pattern as catalog/regions)
    effect(() => {
      const name = this.fishName();
      this.items();
      if (name) this.applySeo(name);
    });
  }

  changePage(p: number) {
    this.page.set(p);
    this.loadPage(p);
  }

  private loadPage(p: number) {
    this.loading.set(true);
    this.api.waters({ fish: [this.slug], page: p, perPage: this.perPage }).subscribe({
      next: (res: Paginated<WaterListItemDto>) => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.total.set(0);
        this.loading.set(false);
      },
    });
  }

  private applySeo(name: string) {
    const uk = this.locale.locale() === 'uk';
    this.seo.apply({
      title: uk
        ? `«${name}: де ловити — FishMap.ua»`
        : `«Where to catch ${name} — FishMap.ua»`,
      description: uk
        ? `Водойми України, де водиться ${name}. Ціни, умови, карта.`
        : `Ukrainian fishing waters where you can catch ${name}. Prices, amenities, map.`,
      paths: this.pair,
      locale: this.locale.locale(),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'FishMap.ua', item: `${this.siteOrigin}/` },
            { '@type': 'ListItem', position: 2, name },
          ],
        },
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: this.items().map((w, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: w.name,
            url: `${this.siteOrigin}${this.locale.link('catalog', w.regionSlug, w.slug)}`,
          })),
        },
      ],
    });
  }
}
