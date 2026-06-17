import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConsentService } from '../core/consent.service';

@Component({
  selector: 'app-cookie-banner',
  imports: [TranslocoPipe],
  templateUrl: './cookie-banner.html',
  styleUrl: './cookie-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieBanner {
  private readonly consent = inject(ConsentService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Current URL, kept in sync on navigation (SSR-safe: seeded from router.url). */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** The cookie banner is a public-site concern — never show it on /admin. */
  private readonly onAdmin = computed(() => this.currentUrl().startsWith('/admin'));

  /**
   * Show only in the browser, only while consent is still unset, and never on
   * admin routes (internal tool — the banner would be intrusive there).
   */
  readonly visible = computed(
    () => this.isBrowser && !this.onAdmin() && this.consent.consent() === null,
  );

  accept(): void {
    this.consent.grant();
  }

  decline(): void {
    this.consent.deny();
  }
}
