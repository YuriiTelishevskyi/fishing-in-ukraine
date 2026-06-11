import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_BASE } from './core/api-base';
import { SITE_ORIGIN } from './core/site-origin';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: API_BASE, useValue: process.env['API_URL'] ?? 'http://localhost:3000' },
    { provide: SITE_ORIGIN, useValue: (process.env['SITE_ORIGIN'] ?? 'https://fishmap.ua').replace(/\/$/, '') },
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
