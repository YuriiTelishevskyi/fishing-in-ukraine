import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { usePageLocale } from '../../core/use-locale';

@Component({
  selector: 'app-fish-page',
  imports: [Header, Footer, TranslocoPipe],
  templateUrl: './fish-page.html',
  styleUrl: './fish-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FishPage {
  readonly locale = usePageLocale();
  private readonly route = inject(ActivatedRoute);
  readonly pair = this.locale.pathPair('fish', [this.route.snapshot.paramMap.get('fishSlug')!]);
}
