import {
  mergeApplicationConfig,
  ApplicationConfig,
  TransferState,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_BASE } from './core/api-base';
import { GA_ID_KEY } from './core/analytics';
import { SITE_ORIGIN } from './core/site-origin';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: API_BASE, useValue: process.env['API_URL'] ?? 'http://localhost:3000' },
    { provide: SITE_ORIGIN, useValue: (process.env['SITE_ORIGIN'] ?? 'https://fishmap.ua').replace(/\/$/, '') },
    // Ship the GA4 measurement id (prod-only env var) to the browser via
    // TransferState — the browser bundle has no access to process.env.
    provideAppInitializer(() => {
      inject(TransferState).set(GA_ID_KEY, process.env['GA_MEASUREMENT_ID'] ?? '');
    }),
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
