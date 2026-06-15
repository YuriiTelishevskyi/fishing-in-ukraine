import { Routes } from '@angular/router';

const pages = {
  home: () => import('./features/home/home').then((m) => m.HomePage),
  catalog: () => import('./features/catalog/catalog').then((m) => m.CatalogPage),
  detail: () => import('./features/water-detail/water-detail').then((m) => m.WaterDetailPage),
  map: () => import('./features/map/map-page').then((m) => m.MapPage),
  fish: () => import('./features/fish/fish-page').then((m) => m.FishPage),
  blogList: () => import('./features/blog/blog-list').then((m) => m.BlogListPage),
  articlePage: () => import('./features/blog/article-page').then((m) => m.ArticlePage),
  biteCalendar: () => import('./features/bite-calendar/bite-calendar').then((m) => m.BiteCalendarPage),
  notFound: () => import('./features/not-found/not-found').then((m) => m.NotFoundPage),
};

const tree = (locale: 'uk' | 'en', seg: { catalog: string; fish: string; map: string; blog: string; biteCalendar: string }): Routes => [
  { path: '', loadComponent: pages.home, data: { locale } },
  { path: seg.catalog, loadComponent: pages.catalog, data: { locale } },
  { path: `${seg.catalog}/:regionSlug`, loadComponent: pages.catalog, data: { locale } },
  { path: `${seg.catalog}/:regionSlug/:waterSlug`, loadComponent: pages.detail, data: { locale } },
  { path: seg.map, loadComponent: pages.map, data: { locale } },
  { path: `${seg.fish}/:fishSlug`, loadComponent: pages.fish, data: { locale } },
  { path: seg.blog, loadComponent: pages.blogList, data: { locale } },
  { path: `${seg.blog}/:articleSlug`, loadComponent: pages.articlePage, data: { locale } },
  { path: seg.biteCalendar, loadComponent: pages.biteCalendar, data: { locale } },
];

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: 'en', children: tree('en', { catalog: 'waters', fish: 'fish', map: 'map', blog: 'blog', biteCalendar: 'bite-calendar' }) },
  ...tree('uk', { catalog: 'vodoymy', fish: 'ryba', map: 'karta', blog: 'blog', biteCalendar: 'kalendar-klyovu' }),
  { path: '**', loadComponent: pages.notFound, data: { locale: 'uk' } },
];
