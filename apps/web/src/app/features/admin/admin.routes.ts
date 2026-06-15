import { Routes } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    providers: [providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: false } }, ripple: false })],
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
        ],
      },
    ],
  },
];
