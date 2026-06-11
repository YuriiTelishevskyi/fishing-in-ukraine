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
          // 'waters/new' and 'waters/:id' land in Task 3
        ],
      },
    ],
  },
];
