import { InjectionToken } from '@angular/core';

/** '' in the browser (same-origin / dev proxy); absolute URL during SSR. */
export const API_BASE = new InjectionToken<string>('API_BASE', { factory: () => '' });
