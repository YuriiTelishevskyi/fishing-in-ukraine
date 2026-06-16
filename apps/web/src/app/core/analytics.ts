import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  TransferState,
  inject,
  makeStateKey,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/** TransferState slot carrying the GA4 measurement id from SSR to the browser. */
export const GA_ID_KEY = makeStateKey<string>('gaId');

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Google Analytics 4 (gtag) loader. Browser-only and consent-gated:
 * gtag is injected lazily by `enable()`, which is called only after the user
 * grants cookie consent AND a measurement id is configured (prod). When no id
 * is set (dev), `enable()` is a no-op so nothing is ever loaded.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);

  private loaded = false;

  /** GA4 measurement id ('' when analytics is disabled). */
  gaId(): string {
    return this.transferState.get(GA_ID_KEY, '');
  }

  /**
   * Load gtag and start tracking SPA pageviews. Idempotent, browser-only,
   * and a no-op when no measurement id is configured.
   */
  enable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.loaded) return;
    const id = this.gaId();
    if (!id) return;
    this.loaded = true;

    const win = this.doc.defaultView as (Window & typeof globalThis) | null;
    if (!win) return;

    const script = this.doc.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    this.doc.head.appendChild(script);

    win.dataLayer = win.dataLayer || [];
    const gtag = (...args: unknown[]) => {
      win.dataLayer!.push(args);
    };
    win.gtag = gtag;

    gtag('js', new Date());
    gtag('config', id, { anonymize_ip: true });

    // SPA pageviews: report each in-app navigation.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        gtag('config', id, { page_path: e.urlAfterRedirects });
      });
  }
}
