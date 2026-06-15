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
  selector: 'app-river-page',
  imports: [Header, Footer, TranslocoPipe, WaterCard, Pager, Breadcrumbs],
  templateUrl: './river-page.html',
  styleUrl: './river-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiverPage {
  readonly locale = usePageLocale();
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  private readonly meta = inject(Meta);
  private readonly transloco = inject(TranslocoService);
  private readonly siteOrigin = inject(SITE_ORIGIN);

  readonly riverSlug = this.route.snapshot.paramMap.get('riverSlug')!;
  readonly pair = this.locale.pathPair('rivers', [this.riverSlug]);

  readonly rivers = toSignal(this.api.rivers(), { initialValue: [] });
  readonly riverName = computed(() => this.rivers().find((r) => r.slug === this.riverSlug)?.name ?? '');

  readonly page = signal(1);
  readonly loading = signal(true);
  readonly items = signal<WaterListItemDto[]>([]);
  readonly total = signal(0);
  readonly perPage = 18;
  /** Once the first page has loaded we can trust total() for the noindex decision. */
  readonly loaded = signal(false);

  readonly crumbs = computed<BreadcrumbItem[]>(() => [
    { label: this.transloco.translate('fishRegion.crumbCatalog'), link: this.locale.link('catalog') },
    { label: this.riverName() },
  ]);

  constructor() {
    this.loadPage(1);

    // Re-apply SEO when the river name resolves and once waters load (to settle noindex).
    // Runs even with an empty name so an unknown/empty river still emits noindex.
    effect(() => {
      const river = this.riverName();
      this.loaded();
      this.total();
      this.applySeo(river);
    });
  }

  changePage(p: number) {
    this.page.set(p);
    this.loadPage(p);
  }

  private loadPage(p: number) {
    this.loading.set(true);
    this.api.waters({ river: this.riverSlug, page: p, perPage: this.perPage }).subscribe({
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

  private applySeo(river: string) {
    const uk = this.locale.locale() === 'uk';

    // Empty combos must not be indexed; only decide once waters have loaded.
    if (this.loaded() && this.total() === 0) {
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
    } else {
      this.meta.removeTag("name='robots'");
    }

    this.seo.apply({
      title: uk
        ? `Риболовля на річці: ${river} — FishMap.ua`
        : `Fishing on the ${river} river — FishMap.ua`,
      description: uk
        ? `${this.total()} водойм і ділянок на річці ${river}. Ціни, умови, карта.`
        : `${this.total()} waters and stretches on the ${river} river. Prices, amenities, map.`,
      paths: this.pair,
      locale: this.locale.locale(),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'FishMap.ua', item: `${this.siteOrigin}/` },
            { '@type': 'ListItem', position: 2, name: river },
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
