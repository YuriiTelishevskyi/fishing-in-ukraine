import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { WATER_TYPES, WATER_TYPE_LABELS } from '@fishing/shared';
import { combineLatest } from 'rxjs';
import { ApiService, WatersFilter } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { usePageLocale } from '../../core/use-locale';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { Breadcrumbs } from '../../shared/breadcrumbs';
import { Pager } from '../../shared/pager';
import { WaterCard } from '../../shared/water-card';
import { CatalogStore } from './catalog.store';

@Component({
  selector: 'app-catalog',
  imports: [Header, Footer, TranslocoPipe, WaterCard, Pager, Breadcrumbs, FormsModule],
  providers: [CatalogStore],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPage {
  readonly locale = usePageLocale();
  readonly store = inject(CatalogStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly regions = toSignal(this.api.regions(), { initialValue: [] });
  readonly fishList = toSignal(this.api.fishSpecies(), { initialValue: [] });
  readonly amenityList = toSignal(this.api.amenities(), { initialValue: [] });
  readonly types = WATER_TYPES;
  readonly typeLabels = WATER_TYPE_LABELS;

  readonly pair = computed(() => {
    const slug = this.route.snapshot.paramMap.get('regionSlug');
    return this.locale.pathPair('catalog', slug ? [slug] : []);
  });

  readonly regionName = computed(
    () => this.regions().find((r) => r.slug === this.route.snapshot.paramMap.get('regionSlug'))?.name,
  );

  // local UI state mirrors the filter
  f: WatersFilter = {};

  // search field two-way bound separately so Enter/blur triggers apply
  searchValue = '';

  constructor() {
    // Use combineLatest so each URL change triggers exactly one load
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(() => this.initFromUrl());

    // Re-apply SEO when regions arrive (so regionName is resolved)
    effect(() => {
      this.regions();
      this.applySeo();
    });
  }

  private initFromUrl() {
    const region = this.route.snapshot.paramMap.get('regionSlug') ?? undefined;
    const q = this.route.snapshot.queryParamMap;
    this.f = {
      region,
      fish: q.get('fish')?.split(',').filter(Boolean) ?? [],
      amenities: q.get('amenities')?.split(',').filter(Boolean) ?? [],
      type: q.get('type') ?? undefined,
      paid: (q.get('paid') as 'true' | 'false') ?? undefined,
      search: q.get('search') ?? undefined,
      page: Number(q.get('page')) || 1,
    };
    this.searchValue = this.f.search ?? '';
    this.store.load(this.f);
    this.applySeo();
  }

  apply(patch: Partial<WatersFilter>) {
    const f = { ...this.f, ...patch, page: patch.page ?? 1 };
    this.router.navigate([this.locale.link('catalog', ...(f.region ? [f.region] : []))], {
      queryParams: {
        fish: f.fish?.length ? f.fish.join(',') : null,
        amenities: f.amenities?.length ? f.amenities.join(',') : null,
        type: f.type || null,
        paid: f.paid || null,
        search: f.search || null,
        page: f.page && f.page > 1 ? f.page : null,
      },
      queryParamsHandling: 'merge',
    });
  }

  toggle(list: 'fish' | 'amenities', slug: string) {
    const cur = new Set(this.f[list] ?? []);
    cur.has(slug) ? cur.delete(slug) : cur.add(slug);
    this.apply({ [list]: [...cur] });
  }

  applyRegion(value: string) {
    this.f.region = value || undefined;
    this.apply({});
  }

  applySearch() {
    this.apply({ search: this.searchValue || undefined });
  }

  reset() {
    this.router.navigate([this.locale.link('catalog')]);
  }

  private applySeo() {
    const uk = this.locale.locale() === 'uk';
    const region = this.regionName();
    this.seo.apply({
      title: region
        ? uk ? `Водойми: ${region} — FishMap.ua` : `Fishing waters: ${region} — FishMap.ua`
        : uk ? 'Каталог водойм України — FishMap.ua' : 'Waters catalog — FishMap.ua',
      description: uk
        ? 'Платні та безкоштовні водойми: фільтри за областю, рибою, зручностями.'
        : 'Paid and free fishing waters: filter by region, fish and amenities.',
      paths: this.pair(),
      locale: this.locale.locale(),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'FishMap.ua', item: 'https://fishmap.ua/' },
            { '@type': 'ListItem', position: 2, name: region ?? 'Каталог' },
          ],
        },
      ],
    });
  }
}
