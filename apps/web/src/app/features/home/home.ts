import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { SITE_ORIGIN } from '../../core/site-origin';
import { usePageLocale } from '../../core/use-locale';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { RevealDirective } from '../../shared/reveal.directive';
import { WaterCard } from '../../shared/water-card';

@Component({
  selector: 'app-home',
  imports: [Header, Footer, TranslocoPipe, WaterCard, RevealDirective, RouterLink, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  readonly locale = usePageLocale();
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly siteOrigin = inject(SITE_ORIGIN);

  readonly pair = this.locale.pathPair('home');
  readonly regions = toSignal(this.api.regions(), { initialValue: [] });
  readonly fish = toSignal(this.api.fishSpecies(), { initialValue: [] });
  readonly featured = toSignal(this.api.waters({ perPage: 6 }), { initialValue: null });

  searchRegion = '';
  searchFish = '';

  constructor() {
    const uk = this.locale.locale() === 'uk';
    this.seo.apply({
      title: uk
        ? 'FishMap.ua — каталог водойм України для риболовлі'
        : 'FishMap.ua — Ukrainian fishing waters catalog',
      description: uk
        ? 'Знайди озеро, став чи річку для риболовлі: ціни, види риби, зручності, карта. Уся Україна.'
        : 'Find a lake, pond or river for fishing in Ukraine: prices, fish species, amenities, map.',
      paths: this.pair,
      locale: this.locale.locale(),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'FishMap.ua',
          url: `${this.siteOrigin}/`,
        },
      ],
    });
  }

  search() {
    const params: Record<string, string> = {};
    if (this.searchFish) params['fish'] = this.searchFish;
    const path = this.searchRegion
      ? this.locale.link('catalog', this.searchRegion)
      : this.locale.link('catalog');
    this.router.navigate([path], { queryParams: params });
  }
}
