import { Routes } from '@angular/router';

const pages = {
  home: () => import('./features/home/home').then((m) => m.HomePage),
  catalog: () => import('./features/catalog/catalog').then((m) => m.CatalogPage),
  detail: () => import('./features/water-detail/water-detail').then((m) => m.WaterDetailPage),
  map: () => import('./features/map/map-page').then((m) => m.MapPage),
  fish: () => import('./features/fish/fish-page').then((m) => m.FishPage),
  notFound: () => import('./features/not-found/not-found').then((m) => m.NotFoundPage),
};

const tree = (locale: 'uk' | 'en', seg: { catalog: string; fish: string; map: string }): Routes => [
  { path: '', loadComponent: pages.home, data: { locale } },
  { path: seg.catalog, loadComponent: pages.catalog, data: { locale } },
  { path: `${seg.catalog}/:regionSlug`, loadComponent: pages.catalog, data: { locale } },
  { path: `${seg.catalog}/:regionSlug/:waterSlug`, loadComponent: pages.detail, data: { locale } },
  { path: seg.map, loadComponent: pages.map, data: { locale } },
  { path: `${seg.fish}/:fishSlug`, loadComponent: pages.fish, data: { locale } },
];

export const routes: Routes = [
  { path: 'en', children: tree('en', { catalog: 'waters', fish: 'fish', map: 'map' }) },
  ...tree('uk', { catalog: 'vodoymy', fish: 'ryba', map: 'karta' }),
  { path: '**', loadComponent: pages.notFound, data: { locale: 'uk' } },
];
