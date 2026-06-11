import { InjectionToken } from '@angular/core';

/** Absolute site origin for canonical/hreflang/JSON-LD URLs (no trailing slash). */
export const SITE_ORIGIN = new InjectionToken<string>('SITE_ORIGIN', {
  factory: () => 'https://fishmap.ua',
});
