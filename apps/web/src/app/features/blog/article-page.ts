import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ArticleDetailDto } from '@fishing/shared';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { SITE_ORIGIN } from '../../core/site-origin';
import { usePageLocale } from '../../core/use-locale';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { Breadcrumbs } from '../../shared/breadcrumbs';

@Component({
  selector: 'app-article-page',
  imports: [Header, Footer, TranslocoPipe, RouterLink, DatePipe, Breadcrumbs],
  templateUrl: './article-page.html',
  styleUrl: './article-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticlePage {
  readonly locale = usePageLocale();
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly siteOrigin = inject(SITE_ORIGIN);

  readonly slug = this.route.snapshot.paramMap.get('articleSlug')!;
  readonly pair = this.locale.pathPair('blog', [this.slug]);

  readonly article = signal<ArticleDetailDto | null>(null);
  readonly notFound = signal(false);

  constructor() {
    this.api.article(this.slug).subscribe({
      next: (a) => {
        this.article.set(a);
        this.applySeo(a);
      },
      error: () => this.notFound.set(true),
    });
  }

  private applySeo(a: ArticleDetailDto) {
    const isEn = this.locale.locale() === 'en';
    const title = a.seoTitle ?? `${a.title} — FishMap.ua`;
    const description = a.seoDescription ?? a.excerpt;
    const canonicalPath = isEn ? this.pair.en : this.pair.uk;

    this.seo.apply({
      title,
      description,
      paths: this.pair,
      locale: this.locale.locale(),
      image: a.coverCardUrl,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: a.title,
          description: a.excerpt,
          datePublished: a.publishedAt,
          dateModified: a.updatedAt,
          image: [
            a.coverFullUrl ? `${this.siteOrigin}${a.coverFullUrl}` : undefined,
            a.coverCardUrl ? `${this.siteOrigin}${a.coverCardUrl}` : undefined,
          ].filter(Boolean),
          author: {
            '@type': 'Organization',
            name: 'FishMap.ua',
            url: this.siteOrigin,
          },
          publisher: {
            '@type': 'Organization',
            name: 'FishMap.ua',
            url: this.siteOrigin,
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${this.siteOrigin}${canonicalPath}`,
          },
        },
      ],
    });
  }
}
