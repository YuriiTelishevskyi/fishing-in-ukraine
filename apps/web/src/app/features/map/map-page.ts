import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { usePageLocale } from '../../core/use-locale';

@Component({
  selector: 'app-map-page',
  imports: [Header, Footer, TranslocoPipe],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPage {
  readonly locale = usePageLocale();
  readonly pair = this.locale.pathPair('map');
}
