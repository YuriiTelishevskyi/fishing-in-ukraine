import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { AnalyticsService } from './analytics';

export type ConsentValue = 'granted' | 'denied';
const STORAGE_KEY = 'cookieConsent';

/**
 * Cookie-consent state. Persisted in localStorage; SSR-safe (null on the
 * server and until hydration, so the banner never appears in SSR HTML).
 * Granting consent also enables analytics (which itself no-ops without a
 * configured GA id).
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly analytics = inject(AnalyticsService);

  /** 'granted' | 'denied' | null (unset / server). */
  readonly consent = signal<ConsentValue | null>(this.read());

  private read(): ConsentValue | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  }

  private persist(value: ConsentValue): void {
    this.consent.set(value);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, value);
    }
  }

  grant(): void {
    this.persist('granted');
    this.analytics.enable();
  }

  deny(): void {
    this.persist('denied');
  }
}
