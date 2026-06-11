import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { usePageLocale } from '../../core/use-locale';

@Component({
  selector: 'app-home',
  imports: [Header, Footer, TranslocoPipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  readonly locale = usePageLocale();
  readonly pair = this.locale.pathPair('home');
}
