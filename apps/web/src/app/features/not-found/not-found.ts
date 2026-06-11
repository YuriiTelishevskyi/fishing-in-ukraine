import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { usePageLocale } from '../../core/use-locale';

@Component({
  selector: 'app-not-found',
  imports: [Header, Footer, TranslocoPipe, RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  readonly locale = usePageLocale();
  readonly pair = { uk: '/', en: '/en' };
}
