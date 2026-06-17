import { Routes } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Brand teal preset for the admin area. Overrides Aura's default-blue primary
 * ramp with the FishMap teal palette so every PrimeNG control (buttons, focus
 * rings, active states, selects, tags) reads brand teal instead of blue.
 * Anchors: 500 = #0E7490 (brand teal), 600 = #0A5566, 700 = #0A4A5C (deep teal);
 * lighter shades derived toward a pale cyan-teal, darker toward the deep navy-teal.
 */
const FishMapPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#ecfdff',
      100: '#cff8fc',
      200: '#a5eef6',
      300: '#67dded',
      400: '#22c2dc',
      500: '#0e7490',
      600: '#0a5566',
      700: '#0a4a5c',
      800: '#0a3d4c',
      900: '#04222c',
      950: '#021318',
    },
  },
});

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    providers: [
      providePrimeNG({
        theme: { preset: FishMapPreset, options: { darkModeSelector: false } },
        ripple: true,
      }),
    ],
    children: [
      { path: 'login', loadComponent: () => import('./login/admin-login').then((m) => m.AdminLogin) },
      {
        path: '',
        loadComponent: () => import('./shell/admin-shell').then((m) => m.AdminShell),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'waters' },
          {
            path: 'waters',
            loadComponent: () => import('./waters/admin-waters-list').then((m) => m.AdminWatersList),
          },
          {
            path: 'waters/new',
            loadComponent: () => import('./waters/admin-water-form').then((m) => m.AdminWaterForm),
          },
          {
            path: 'waters/:id',
            loadComponent: () => import('./waters/admin-water-form').then((m) => m.AdminWaterForm),
          },
          {
            path: 'articles',
            loadComponent: () => import('./articles/admin-articles-list').then((m) => m.AdminArticlesList),
          },
          {
            path: 'articles/new',
            loadComponent: () => import('./articles/admin-article-form').then((m) => m.AdminArticleForm),
          },
          {
            path: 'articles/:id',
            loadComponent: () => import('./articles/admin-article-form').then((m) => m.AdminArticleForm),
          },
          {
            path: 'reviews',
            loadComponent: () => import('./reviews/admin-reviews-list').then((m) => m.AdminReviewsList),
          },
          {
            path: 'spots',
            loadComponent: () => import('./spots/admin-spots-list').then((m) => m.AdminSpotsList),
          },
          {
            path: 'catch-reports',
            loadComponent: () => import('./catch-reports/admin-catch-reports-list').then((m) => m.AdminCatchReportsList),
          },
          {
            path: 'water-news',
            loadComponent: () => import('./water-news/admin-water-news-list').then((m) => m.AdminWaterNewsList),
          },
          {
            path: 'water-news/new',
            loadComponent: () => import('./water-news/admin-water-news-form').then((m) => m.AdminWaterNewsForm),
          },
          {
            path: 'water-news/:id',
            loadComponent: () => import('./water-news/admin-water-news-form').then((m) => m.AdminWaterNewsForm),
          },
        ],
      },
    ],
  },
];
