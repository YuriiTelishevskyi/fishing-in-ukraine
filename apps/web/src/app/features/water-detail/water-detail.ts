import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { usePageLocale } from '../../core/use-locale';

@Component({
  selector: 'app-water-detail',
  imports: [Header, Footer, TranslocoPipe],
  templateUrl: './water-detail.html',
  styleUrl: './water-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaterDetailPage {
  readonly locale = usePageLocale();
  private readonly route = inject(ActivatedRoute);
  readonly pair = this.locale.pathPair('catalog', [
    this.route.snapshot.paramMap.get('regionSlug')!,
    this.route.snapshot.paramMap.get('waterSlug')!,
  ]);
}
