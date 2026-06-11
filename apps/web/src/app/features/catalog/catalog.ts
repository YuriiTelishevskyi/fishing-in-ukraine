import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { usePageLocale } from '../../core/use-locale';

@Component({
  selector: 'app-catalog',
  imports: [Header, Footer, TranslocoPipe],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPage {
  readonly locale = usePageLocale();
  private readonly route = inject(ActivatedRoute);
  readonly pair = (() => {
    const regionSlug = this.route.snapshot.paramMap.get('regionSlug');
    return this.locale.pathPair('catalog', regionSlug ? [regionSlug] : []);
  })();
}
