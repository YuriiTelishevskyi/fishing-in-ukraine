import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Paginated, WaterListItemDto } from '@fishing/shared';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { SITE_ORIGIN } from '../../core/site-origin';
import { usePageLocale } from '../../core/use-locale';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { Breadcrumbs, BreadcrumbItem } from '../../shared/breadcrumbs';
import { Pager } from '../../shared/pager';
import { WaterCard } from '../../shared/water-card';

@Component({
  selector: 'app-fish-region-page',
  imports: [Header, Footer, TranslocoPipe, WaterCard, Pager, Breadcrumbs],
  templateUrl: './fish-region-page.html',
  styleUrl: './fish-region-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FishRegionPage {
  readonly locale = usePageLocale();
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  private readonly meta = inject(Meta);
  private readonly transloco = inject(TranslocoService);
  private readonly siteOrigin = inject(SITE_ORIGIN);

  readonly fishSlug = this.route.snapshot.paramMap.get('fishSlug')!;
  readonly regionSlug = this.route.snapshot.paramMap.get('regionSlug')!;
  readonly pair = this.locale.pathPair('fish', [this.fishSlug, this.regionSlug]);

  readonly fishSpecies = toSignal(this.api.fishSpecies(), { initialValue: [] });
  readonly regionsList = toSignal(this.api.regions(), { initialValue: [] });
  readonly fishName = computed(() => this.fishSpecies().find((f) => f.slug === this.fishSlug)?.name ?? '');
  readonly regionName = computed(() => this.regionsList().find((r) => r.slug === this.regionSlug)?.name ?? '');

  readonly page = signal(1);
  readonly loading = signal(true);
  readonly items = signal<WaterListItemDto[]>([]);
  readonly total = signal(0);
  readonly perPage = 18;
  /** Once the first page has loaded we can trust total() for the noindex decision. */
  readonly loaded = signal(false);

  readonly crumbs = computed<BreadcrumbItem[]>(() => [
    { label: this.transloco.translate('fishRegion.crumbCatalog'), link: this.locale.link('catalog') },
    { label: this.regionName(), link: this.locale.link('catalog', this.regionSlug) },
    { label: this.fishName() },
  ]);

  constructor() {
    this.loadPage(1);

    // Re-apply SEO once both names resolve (and re-run once waters load to settle noindex).
    effect(() => {
      const fish = this.fishName();
      const region = this.regionName();
      this.loaded();
      this.total();
      if (fish && region) this.applySeo(fish, region);
    });
  }

  changePage(p: number) {
    this.page.set(p);
    this.loadPage(p);
  }

  private loadPage(p: number) {
    this.loading.set(true);
    this.api.waters({ region: this.regionSlug, fish: [this.fishSlug], page: p, perPage: this.perPage }).subscribe({
      next: (res: Paginated<WaterListItemDto>) => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: () => {
        this.items.set([]);
        this.total.set(0);
        this.loading.set(false);
        this.loaded.set(true);
      },
    });
  }

  private applySeo(fish: string, region: string) {
    const uk = this.locale.locale() === 'uk';

    // Empty combos must not be indexed; only decide once waters have loaded.
    if (this.loaded() && this.total() === 0) {
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
    } else {
      this.meta.removeTag("name='robots'");
    }

    this.seo.apply({
      title: uk
        ? `Де ловити ${fish} на ${region} — FishMap.ua`
        : `Where to catch ${fish} in ${region} — FishMap.ua`,
      description: uk
        ? `${this.total()} водойм у регіоні ${region}, де водиться ${fish}. Ціни, умови, карта.`
        : `${this.total()} waters in ${region} where you can catch ${fish}. Prices, amenities, map.`,
      paths: this.pair,
      locale: this.locale.locale(),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'FishMap.ua', item: `${this.siteOrigin}/` },
            { '@type': 'ListItem', position: 2, name: region },
            { '@type': 'ListItem', position: 3, name: fish },
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
