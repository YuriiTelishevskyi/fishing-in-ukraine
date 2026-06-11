import { inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Locale } from '@fishing/shared';
import { LocaleService } from './locale.service';

/** Call in every page component constructor: applies route locale, returns the service. */
export function usePageLocale(): LocaleService {
  const locale = inject(LocaleService);
  const route = inject(ActivatedRoute);
  locale.set((route.snapshot.data['locale'] as Locale) ?? 'uk');
  return locale;
}
