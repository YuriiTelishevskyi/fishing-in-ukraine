import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideTransloco } from '@jsverse/transloco';
import { routes } from './app.routes';
import { StaticTranslocoLoader } from './core/transloco.loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
    provideClientHydration(withEventReplay(), withHttpTransferCacheOptions({ includePostRequests: false })),
    provideHttpClient(withFetch()),
    provideTransloco({
      config: {
        availableLangs: ['uk', 'en'],
        defaultLang: 'uk',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: StaticTranslocoLoader,
    }),
  ],
};
