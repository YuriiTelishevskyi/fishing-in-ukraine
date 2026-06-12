import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ArticleListItemDto, Paginated } from '@fishing/shared';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { SITE_ORIGIN } from '../../core/site-origin';
import { usePageLocale } from '../../core/use-locale';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { Pager } from '../../shared/pager';

@Component({
  selector: 'app-blog-list',
  imports: [Header, Footer, TranslocoPipe, RouterLink, DatePipe, Pager],
  templateUrl: './blog-list.html',
  styleUrl: './blog-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogListPage {
  readonly locale = usePageLocale();
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  private readonly siteOrigin = inject(SITE_ORIGIN);

  readonly pair = this.locale.pathPair('blog');

  readonly page = signal(1);
  readonly loading = signal(true);
  readonly items = signal<ArticleListItemDto[]>([]);
  readonly total = signal(0);
  readonly perPage = 12;

  constructor() {
    this.loadPage(1);
    this.applySeo();
  }

  changePage(p: number) {
    this.page.set(p);
    this.loadPage(p);
  }

  private loadPage(p: number) {
    this.loading.set(true);
    this.api.articles(p).subscribe({
      next: (res: Paginated<ArticleListItemDto>) => {
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

  private applySeo() {
    const isEn = this.locale.locale() === 'en';
    this.seo.apply({
      title: isEn ? 'Fishing blog — FishMap.ua' : 'Блог про риболовлю — FishMap.ua',
      description: isEn
        ? 'Tips, spots and experience for anglers in Ukraine.'
        : 'Поради, місця та досвід для рибалок України.',
      paths: this.pair,
      locale: this.locale.locale(),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: isEn ? 'FishMap.ua — Fishing blog' : 'FishMap.ua — Блог про риболовлю',
          url: `${this.siteOrigin}${isEn ? this.pair.en : this.pair.uk}`,
        },
      ],
    });
  }
}
