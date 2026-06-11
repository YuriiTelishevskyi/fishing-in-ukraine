# Catalog MVP — Plan 2 of 4: Public Frontend (WOW UI)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public bilingual (uk/en) SSR site — home, catalog with filters, water detail, full-screen map, fish landings — on the Plan-1 API, with a visually impressive ("WOW") but Core-Web-Vitals-friendly UI.

**Architecture:** Angular 20 SSR (`apps/web`), standalone components, signals + `@ngrx/signals` store for the catalog, Transloco for runtime i18n with STATIC dictionary imports (SSR-safe), dual route trees (uk at `/`, en under `/en` with English segments), `SeoService` for title/meta/canonical/hreflang/JSON-LD, Leaflet + markercluster loaded client-only. API consumed via relative `/api` through a dev proxy; on the SSR server requests go to `API_URL` (default `http://localhost:3000`).

**Tech Stack:** Angular 20.3 SSR, @jsverse/transloco, @ngrx/signals, leaflet + leaflet.markercluster, @fishing/shared types, SCSS design tokens, Manrope/Inter fonts.

**Spec:** `docs/superpowers/specs/2026-06-11-catalog-mvp-design.md` §5 (frontend, URLs, SEO). Plan 3 = admin UI, Plan 4 = deploy.

**IMPORTANT — no tests:** do NOT create `*.spec.ts` files; delete scaffold spec files you touch. Verification = `ng build` + serving + curl/view-source checks.

**Design language (the "WOW" contract — every visual task MUST follow it):**
- Palette (CSS custom props in `styles.scss`): ink `#0B1B22`, surface `#F6F9FA`, card `#FFFFFF`, primary `#0E7490` (hover `#0C657E`), deep hero gradient `#04222C → #0A4A5C`, accent `#F59E0B`, success `#16A34A`, muted text `#5B7480`, line `#E2ECEF`.
- Type: `Manrope` 700/800 for headings, `Inter` 400/500/600 body (Google Fonts, preconnect, `display=swap`). H1 clamp(2.2rem, 5vw, 3.6rem).
- Shape & depth: cards radius 16px, soft shadows (`0 1px 2px rgba(11,27,34,.06), 0 8px 24px rgba(11,27,34,.08)`), hover lift `translateY(-3px)` + stronger shadow, 180ms ease-out.
- Motion: `.reveal` elements fade+rise 16px on scroll (IntersectionObserver directive), durations 150–300ms, `prefers-reduced-motion` respected.
- Hero: layered CSS gradient + two animated SVG wave layers (pure CSS/SVG, no raster assets), glassmorphism search panel (`backdrop-filter: blur(14px)`, translucent white).
- Images: `NgOptimizedImage`, gradient placeholder block with a fish glyph when a water has no photo.

**Conventions:** all components standalone, `changeDetection: ChangeDetectionStrategy.OnPush`, `inject()` style, native control flow (`@if/@for`). Commit per task with the exact message. Work from repo root. Branch: `feature/public-frontend`. Postgres + seeded API from Plan 1 available (`npm run dev:api`, port 3000).

---

### Task 1: Web foundation — shell, design tokens, proxy, API base

**Files:**
- Create: `apps/web/proxy.conf.json`, `apps/web/src/app/core/api-base.ts`, `apps/web/src/app/layout/header.ts`, `apps/web/src/app/layout/header.html`, `apps/web/src/app/layout/header.scss`, `apps/web/src/app/layout/footer.ts`, `apps/web/src/app/layout/footer.html`, `apps/web/src/app/layout/footer.scss`
- Modify: `apps/web/src/styles.scss`, `apps/web/src/index.html`, `apps/web/src/app/app.ts`, `apps/web/src/app/app.html`, `apps/web/src/app/app.scss`, `apps/web/src/app/app.config.ts`, `apps/web/src/app/app.config.server.ts`, `apps/web/package.json`
- Delete: `apps/web/src/app/app.spec.ts`

- [ ] **Step 1:** Delete `apps/web/src/app/app.spec.ts` (no tests in this project).

- [ ] **Step 2:** `apps/web/proxy.conf.json`:

```json
{
  "/api": { "target": "http://localhost:3000", "secure": false },
  "/uploads": { "target": "http://localhost:3000", "secure": false },
  "/sitemap.xml": { "target": "http://localhost:3000", "secure": false }
}
```

In `apps/web/package.json` change the `start` script to `"ng serve --proxy-config proxy.conf.json"`.

- [ ] **Step 3:** `apps/web/src/app/core/api-base.ts`:

```ts
import { InjectionToken } from '@angular/core';

/** '' in the browser (same-origin / dev proxy); absolute URL during SSR. */
export const API_BASE = new InjectionToken<string>('API_BASE', { factory: () => '' });
```

In `apps/web/src/app/app.config.server.ts` add to `providers`:

```ts
{ provide: API_BASE, useValue: process.env['API_URL'] ?? 'http://localhost:3000' },
```

- [ ] **Step 4:** `apps/web/src/index.html` — replace with:

```html
<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <title>Fishing in Ukraine</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#04222C">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@700;800&display=swap" rel="stylesheet">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

- [ ] **Step 5:** `apps/web/src/styles.scss` — full design-token system:

```scss
:root {
  --ink: #0b1b22;
  --surface: #f6f9fa;
  --card: #ffffff;
  --primary: #0e7490;
  --primary-hover: #0c657e;
  --hero-from: #04222c;
  --hero-to: #0a4a5c;
  --accent: #f59e0b;
  --success: #16a34a;
  --muted: #5b7480;
  --line: #e2ecef;
  --radius: 16px;
  --shadow: 0 1px 2px rgba(11, 27, 34, 0.06), 0 8px 24px rgba(11, 27, 34, 0.08);
  --shadow-lift: 0 2px 4px rgba(11, 27, 34, 0.08), 0 16px 40px rgba(11, 27, 34, 0.16);
  --font-head: 'Manrope', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--font-body);
  color: var(--ink);
  background: var(--surface);
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4 { font-family: var(--font-head); line-height: 1.15; margin: 0 0 0.5em; }
h1 { font-size: clamp(2.2rem, 5vw, 3.6rem); font-weight: 800; }
h2 { font-size: clamp(1.5rem, 3vw, 2.2rem); font-weight: 800; }
a { color: var(--primary); text-decoration: none; }
img { max-width: 100%; display: block; }

.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 22px; border-radius: 999px; border: 0;
  font: 600 1rem var(--font-body); cursor: pointer;
  transition: transform 0.18s ease-out, box-shadow 0.18s ease-out, background 0.18s ease-out;
}
.btn--primary { background: var(--primary); color: #fff; }
.btn--primary:hover { background: var(--primary-hover); transform: translateY(-2px); box-shadow: var(--shadow); }
.btn--accent { background: var(--accent); color: #3b2402; }
.btn--accent:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
.btn--ghost { background: rgba(255, 255, 255, 0.12); color: #fff; border: 1px solid rgba(255, 255, 255, 0.3); }
.btn--ghost:hover { background: rgba(255, 255, 255, 0.2); }

.chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px; border-radius: 999px;
  background: #e7f3f6; color: var(--primary);
  font: 500 0.82rem var(--font-body);
}

.badge-verified {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 999px;
  background: #dcfce7; color: var(--success); font: 600 0.78rem var(--font-body);
}

.card {
  background: var(--card); border-radius: var(--radius);
  box-shadow: var(--shadow); overflow: hidden;
  transition: transform 0.18s ease-out, box-shadow 0.18s ease-out;
}
.card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lift); }

.reveal { opacity: 0; transform: translateY(16px); transition: opacity 0.45s ease-out, transform 0.45s ease-out; }
.reveal.is-visible { opacity: 1; transform: none; }

.skeleton {
  background: linear-gradient(90deg, #eef4f6 25%, #e2ecef 50%, #eef4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 8px;
}
@keyframes shimmer { to { background-position: -200% 0; } }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .reveal, .card, .btn { transition: none; }
  .reveal { opacity: 1; transform: none; }
  .skeleton { animation: none; }
}
```

- [ ] **Step 6:** Header (`apps/web/src/app/layout/header.ts|html|scss`). Logo «🎣 РибаМапа / FishMap», nav links (Каталог, Карта), lang switcher placeholder (becomes functional in Task 2). Translucent dark header that overlays the hero (position absolute over hero, becomes solid sticky on inner pages via `[solid]` input).

`header.ts`:

```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  solid = input(false);
}
```

`header.html`:

```html
<header class="hdr" [class.hdr--solid]="solid()">
  <div class="container hdr__row">
    <a routerLink="/" class="hdr__logo">🎣 <span>FishMap<em>.ua</em></span></a>
    <nav class="hdr__nav">
      <a routerLink="/vodoymy">Каталог</a>
      <a routerLink="/karta">Карта</a>
    </nav>
    <div class="hdr__lang"><!-- lang switcher lands in Task 2 --></div>
  </div>
</header>
```

`header.scss`:

```scss
.hdr {
  position: absolute; inset: 0 0 auto; z-index: 50; padding: 14px 0;
  color: #fff;
  &--solid { position: sticky; top: 0; background: var(--hero-from); box-shadow: var(--shadow); }
  &__row { display: flex; align-items: center; gap: 28px; }
  &__logo {
    font: 800 1.3rem var(--font-head); color: #fff; display: flex; gap: 8px; align-items: center;
    em { color: var(--accent); font-style: normal; }
  }
  &__nav { display: flex; gap: 20px; margin-left: auto;
    a { color: rgba(255, 255, 255, 0.85); font-weight: 600; &:hover { color: #fff; } }
  }
  &__lang { display: flex; gap: 6px; }
}
```

- [ ] **Step 7:** Footer (`footer.ts|html|scss`) — dark band: logo, short tagline, nav (Каталог/Карта), `© 2026 FishMap.ua`. Background `var(--hero-from)`, white/60 text, padding 48px 0.

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {}
```

```html
<footer class="ftr">
  <div class="container ftr__row">
    <div>
      <div class="ftr__logo">🎣 FishMap<em>.ua</em></div>
      <p>Каталог водойм України для рибалок.</p>
    </div>
    <nav>
      <a routerLink="/vodoymy">Каталог водойм</a>
      <a routerLink="/karta">Карта</a>
    </nav>
  </div>
  <div class="container ftr__copy">© 2026 FishMap.ua</div>
</footer>
```

```scss
.ftr {
  margin-top: 80px; background: var(--hero-from); color: rgba(255, 255, 255, 0.6);
  padding: 48px 0 24px;
  &__row { display: flex; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
  &__logo { font: 800 1.2rem var(--font-head); color: #fff; em { color: var(--accent); font-style: normal; } }
  nav { display: flex; flex-direction: column; gap: 8px; a { color: rgba(255, 255, 255, 0.75); } }
  &__copy { margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.12); font-size: 0.85rem; }
}
```

- [ ] **Step 8:** Rewire the root component. `app.html` → exactly:

```html
<router-outlet />
```

(The header/footer are added per-layout in Task 2's pages — pages need control over the header overlay variant.) `app.ts` stays the scaffold class (selector `app-root`, template/style refs unchanged); empty `app.scss`. Remove the scaffold welcome markup entirely.

- [ ] **Step 9:** `apps/web/src/app/app.config.ts` — ensure providers include `provideHttpClient(withFetch())` and hydration with HTTP transfer cache:

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
    provideClientHydration(withEventReplay(), withHttpTransferCacheOptions({ includePostRequests: false })),
    provideHttpClient(withFetch()),
  ],
};
```

(Keep whatever scaffold providers already exist that aren't superseded; don't duplicate.)

- [ ] **Step 10: Verify** — `npm run build:web` passes. `npm run dev:api` + `npm run dev:web` in background; `curl -s http://localhost:4200/ | grep -o '<app-root'` → present; `curl -s http://localhost:4200/api/health` → `{"status":"ok"}` (proxy works). Kill servers.

- [ ] **Step 11: Commit** — `git add -A && git commit -m "feat(web): foundation — design tokens, layout shell, dev proxy, api base"`

---

### Task 2: i18n (Transloco) + dual locale route trees + placeholder pages

**Files:**
- Create: `apps/web/src/app/core/locale.service.ts`, `apps/web/src/app/core/transloco.loader.ts`, `apps/web/src/assets/i18n/uk.json`, `apps/web/src/assets/i18n/en.json`, `apps/web/src/app/layout/lang-switcher.ts` (+html/scss), `apps/web/src/app/features/home/home.ts` (+html/scss), `apps/web/src/app/features/catalog/catalog.ts` (+html/scss), `apps/web/src/app/features/water-detail/water-detail.ts` (+html/scss), `apps/web/src/app/features/map/map-page.ts` (+html/scss), `apps/web/src/app/features/fish/fish-page.ts` (+html/scss), `apps/web/src/app/features/not-found/not-found.ts` (+html/scss)
- Modify: `apps/web/src/app/app.routes.ts`, `apps/web/src/app/app.routes.server.ts`, `apps/web/src/app/app.config.ts`, `apps/web/src/app/layout/header.ts|html`

- [ ] **Step 1:** `npm install @jsverse/transloco -w apps/web`

- [ ] **Step 2:** Dictionaries. `uk.json`:

```json
{
  "nav": { "catalog": "Каталог", "map": "Карта" },
  "hero": {
    "title": "Знайди свою водойму",
    "subtitle": "Каталог озер, ставів і річок України — з цінами, видами риби та умовами",
    "searchRegion": "Область",
    "searchFish": "Риба",
    "anyRegion": "Уся Україна",
    "anyFish": "Будь-яка риба",
    "cta": "Знайти водойму",
    "mapCta": "Дивитись карту"
  },
  "home": {
    "featured": "Перевірені водойми",
    "regions": "Водойми за областями",
    "fishTitle": "Кого ловимо?",
    "ctaTitle": "Маєш власну водойму?",
    "ctaText": "Додай її в каталог безкоштовно — рибалки тебе знайдуть.",
    "ctaBtn": "Звʼязатися з нами"
  },
  "catalog": {
    "title": "Каталог водойм",
    "found": "Знайдено: {{count}}",
    "filters": "Фільтри",
    "region": "Область",
    "fish": "Риба",
    "amenities": "Зручності",
    "type": "Тип водойми",
    "paid": "Оплата",
    "any": "Будь-яка",
    "free": "Безкоштовні",
    "paidOnly": "Платні",
    "search": "Пошук за назвою",
    "reset": "Скинути",
    "empty": "Нічого не знайдено. Спробуй змінити фільтри.",
    "prev": "Назад",
    "next": "Далі"
  },
  "water": {
    "price": "Вартість",
    "free": "Безкоштовно",
    "fish": "Риба",
    "amenities": "Зручності",
    "rules": "Правила",
    "contacts": "Контакти",
    "onMap": "На карті",
    "area": "Площа",
    "ha": "га",
    "from": "від",
    "uah": "грн",
    "verified": "Перевірено",
    "moreWaters": "Інші водойми області"
  },
  "fishPage": { "title": "Де ловити: {{fish}}", "waters": "Водойми з цією рибою" },
  "map": { "title": "Карта водойм" },
  "notFound": { "title": "Сторінку не знайдено", "text": "Можливо, водойма переїхала.", "home": "На головну" },
  "footer": { "tagline": "Каталог водойм України для рибалок." }
}
```

`en.json` — same keys, English values:

```json
{
  "nav": { "catalog": "Catalog", "map": "Map" },
  "hero": {
    "title": "Find your fishing spot",
    "subtitle": "Lakes, ponds and rivers of Ukraine — with prices, fish species and amenities",
    "searchRegion": "Region",
    "searchFish": "Fish",
    "anyRegion": "All Ukraine",
    "anyFish": "Any fish",
    "cta": "Find waters",
    "mapCta": "Open the map"
  },
  "home": {
    "featured": "Verified waters",
    "regions": "Waters by region",
    "fishTitle": "What are we catching?",
    "ctaTitle": "Own a fishing spot?",
    "ctaText": "Add it to the catalog for free — anglers will find you.",
    "ctaBtn": "Contact us"
  },
  "catalog": {
    "title": "Waters catalog",
    "found": "Found: {{count}}",
    "filters": "Filters",
    "region": "Region",
    "fish": "Fish",
    "amenities": "Amenities",
    "type": "Water type",
    "paid": "Payment",
    "any": "Any",
    "free": "Free",
    "paidOnly": "Paid",
    "search": "Search by name",
    "reset": "Reset",
    "empty": "Nothing found. Try different filters.",
    "prev": "Prev",
    "next": "Next"
  },
  "water": {
    "price": "Price",
    "free": "Free",
    "fish": "Fish",
    "amenities": "Amenities",
    "rules": "Rules",
    "contacts": "Contacts",
    "onMap": "On the map",
    "area": "Area",
    "ha": "ha",
    "from": "from",
    "uah": "UAH",
    "verified": "Verified",
    "moreWaters": "More waters in this region"
  },
  "fishPage": { "title": "Where to catch: {{fish}}", "waters": "Waters with this fish" },
  "map": { "title": "Waters map" },
  "notFound": { "title": "Page not found", "text": "Maybe the water has moved.", "home": "Go home" },
  "footer": { "tagline": "Ukrainian fishing waters catalog." }
}
```

- [ ] **Step 3:** Static SSR-safe loader `apps/web/src/app/core/transloco.loader.ts`:

```ts
import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import en from '../../assets/i18n/en.json';
import uk from '../../assets/i18n/uk.json';

const DICTS: Record<string, Translation> = { uk, en };

@Injectable({ providedIn: 'root' })
export class StaticTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return of(DICTS[lang] ?? DICTS['uk']);
  }
}
```

If TS complains about JSON imports, add `"resolveJsonModule": true` to `apps/web/tsconfig.json` compilerOptions.

In `app.config.ts` providers add:

```ts
provideTransloco({
  config: {
    availableLangs: ['uk', 'en'],
    defaultLang: 'uk',
    reRenderOnLangChange: true,
    prodMode: true,
  },
  loader: StaticTranslocoLoader,
}),
```

- [ ] **Step 4:** `apps/web/src/app/core/locale.service.ts` — single source of locale truth + URL helpers:

```ts
import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Locale } from '@fishing/shared';

const SEGMENTS: Record<string, { uk: string; en: string }> = {
  catalog: { uk: 'vodoymy', en: 'waters' },
  fish: { uk: 'ryba', en: 'fish' },
  map: { uk: 'karta', en: 'map' },
};

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly transloco = inject(TranslocoService);
  private readonly doc = inject(DOCUMENT);

  readonly locale = signal<Locale>('uk');

  set(locale: Locale) {
    this.locale.set(locale);
    this.transloco.setActiveLang(locale);
    this.doc.documentElement.lang = locale;
  }

  /** '' for uk, '/en' for en */
  get prefix(): string {
    return this.locale() === 'en' ? '/en' : '';
  }

  link(kind: keyof typeof SEGMENTS, ...slugs: string[]): string {
    const seg = SEGMENTS[kind][this.locale()];
    return [this.prefix, seg, ...slugs].join('/').replace(/\/+/g, '/') || '/';
  }

  home(): string {
    return this.prefix || '/';
  }

  /** uk/en path pair for the CURRENT page — used for hreflang + the lang switcher. */
  pathPair(kind: keyof typeof SEGMENTS | 'home', slugs: string[] = []): { uk: string; en: string } {
    if (kind === 'home') return { uk: '/', en: '/en' };
    const tail = slugs.length ? '/' + slugs.join('/') : '';
    return {
      uk: `/${SEGMENTS[kind].uk}${tail}`,
      en: `/en/${SEGMENTS[kind].en}${tail}`,
    };
  }
}
```

- [ ] **Step 5:** Routes. `apps/web/src/app/app.routes.ts`:

```ts
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
```

`apps/web/src/app/app.routes.server.ts`:

```ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Server }];
```

- [ ] **Step 6:** Every page component reads `data.locale` and calls `LocaleService.set()` in its constructor — make a tiny base helper instead of repeating: `apps/web/src/app/core/use-locale.ts`:

```ts
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
```

- [ ] **Step 7:** Placeholder pages (real content lands in Tasks 4–8). Each: standalone, OnPush, header+footer, h1 from transloco. Example `home.ts` (repeat the pattern for catalog/water-detail/map-page/fish-page/not-found with their own selectors/keys):

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { usePageLocale } from '../../core/use-locale';

@Component({
  selector: 'app-home',
  imports: [Header, Footer, TranslocoPipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  readonly locale = usePageLocale();
}
```

`home.html` placeholder:

```html
<app-header [solid]="true" />
<main class="container" style="padding: 48px 0">
  <h1>{{ 'hero.title' | transloco }}</h1>
</main>
<app-footer />
```

(not-found.html shows `notFound.title`, link home.)

- [ ] **Step 8:** Lang switcher `apps/web/src/app/layout/lang-switcher.ts` (+html/scss) — two pills UA/EN linking to the same logical page in the other locale. It receives the current page's path pair:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-lang-switcher',
  imports: [RouterLink],
  templateUrl: './lang-switcher.html',
  styleUrl: './lang-switcher.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangSwitcher {
  private readonly locale = inject(LocaleService);
  pair = input.required<{ uk: string; en: string }>();
  readonly current = computed(() => this.locale.locale());
}
```

```html
<a [routerLink]="pair().uk" class="pill" [class.pill--on]="current() === 'uk'">UA</a>
<a [routerLink]="pair().en" class="pill" [class.pill--on]="current() === 'en'">EN</a>
```

```scss
:host { display: inline-flex; gap: 4px; background: rgba(255, 255, 255, 0.12); border-radius: 999px; padding: 3px; }
.pill {
  padding: 4px 12px; border-radius: 999px; color: rgba(255, 255, 255, 0.8);
  font: 600 0.8rem var(--font-body);
  &--on { background: #fff; color: var(--ink); }
}
```

Header: add `pair = input<{ uk: string; en: string }>({ uk: '/', en: '/en' });`, import LangSwitcher + TranslocoPipe, render `<app-lang-switcher [pair]="pair()" />` in `.hdr__lang`, and make nav links locale-aware: inject LocaleService as `loc` (public readonly) and use `[routerLink]="loc.link('catalog')"` / `loc.link('map')` with labels `{{ 'nav.catalog' | transloco }}` / `{{ 'nav.map' | transloco }}`; logo links to `loc.home()`.

- [ ] **Step 9: Verify** — build passes. Dev servers up: `curl -s http://localhost:4200/ | grep -o 'Знайди свою водойму'` → match; `curl -s http://localhost:4200/en | grep -o 'Find your fishing spot'` → match; `curl -s http://localhost:4200/en | grep -o '<html lang="en"'` → match; `curl -s -o /dev/null -w '%{http_code}' http://localhost:4200/no-such-page` → 200 with not-found content (status stays 200 for now). Kill servers.

- [ ] **Step 10: Commit** — `git add -A && git commit -m "feat(web): transloco i18n with uk/en route trees and lang switcher"`

---

### Task 3: Core services — typed ApiService, SeoService, reveal directive, shared UI

**Files:**
- Create: `apps/web/src/app/core/api.service.ts`, `apps/web/src/app/core/seo.service.ts`, `apps/web/src/app/shared/reveal.directive.ts`, `apps/web/src/app/shared/water-card.ts` (+html/scss), `apps/web/src/app/shared/breadcrumbs.ts` (+html/scss), `apps/web/src/app/shared/pager.ts` (+html/scss)

- [ ] **Step 1:** `api.service.ts` — every call sends `lang` from LocaleService; base URL from API_BASE:

```ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AmenityDto, FishSpeciesDto, MapPinDto, Paginated, RegionDto, WaterDetailDto, WaterListItemDto,
} from '@fishing/shared';
import { Observable } from 'rxjs';
import { API_BASE } from './api-base';
import { LocaleService } from './locale.service';

export interface WatersFilter {
  region?: string;
  fish?: string[];
  amenities?: string[];
  type?: string;
  paid?: 'true' | 'false';
  search?: string;
  page?: number;
  perPage?: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE);
  private readonly locale = inject(LocaleService);

  private params(extra: Record<string, string | number | undefined> = {}): HttpParams {
    let p = new HttpParams().set('lang', this.locale.locale());
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== '') p = p.set(k, String(v));
    }
    return p;
  }

  regions(): Observable<RegionDto[]> {
    return this.http.get<RegionDto[]>(`${this.base}/api/regions`, { params: this.params() });
  }

  fishSpecies(): Observable<FishSpeciesDto[]> {
    return this.http.get<FishSpeciesDto[]>(`${this.base}/api/fish-species`, { params: this.params() });
  }

  amenities(): Observable<AmenityDto[]> {
    return this.http.get<AmenityDto[]>(`${this.base}/api/amenities`, { params: this.params() });
  }

  waters(f: WatersFilter): Observable<Paginated<WaterListItemDto>> {
    return this.http.get<Paginated<WaterListItemDto>>(`${this.base}/api/waters`, {
      params: this.params({
        region: f.region,
        fish: f.fish?.length ? f.fish.join(',') : undefined,
        amenities: f.amenities?.length ? f.amenities.join(',') : undefined,
        type: f.type,
        paid: f.paid,
        search: f.search,
        page: f.page,
        perPage: f.perPage,
      }),
    });
  }

  mapPins(f: WatersFilter = {}): Observable<MapPinDto[]> {
    return this.http.get<MapPinDto[]>(`${this.base}/api/waters/map`, {
      params: this.params({
        region: f.region,
        fish: f.fish?.length ? f.fish.join(',') : undefined,
        type: f.type,
        paid: f.paid,
      }),
    });
  }

  water(slug: string): Observable<WaterDetailDto> {
    return this.http.get<WaterDetailDto>(`${this.base}/api/waters/${slug}`, { params: this.params() });
  }
}
```

NOTE (from Plan-1 review): the API rejects unknown query params (400) — never append anything not listed above.

- [ ] **Step 2:** `seo.service.ts`:

```ts
import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoPage {
  title: string;
  description: string;
  /** absolute-path pair for hreflang + canonical, e.g. {uk:'/vodoymy', en:'/en/waters'} */
  paths: { uk: string; en: string };
  locale: 'uk' | 'en';
  image?: string | null;
  jsonLd?: object[];
}

const ORIGIN = 'https://fishmap.ua'; // replaced by real domain at deploy; relative canonical is invalid

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  apply(p: SeoPage) {
    this.title.setTitle(p.title);
    this.meta.updateTag({ name: 'description', content: p.description });
    this.meta.updateTag({ property: 'og:title', content: p.title });
    this.meta.updateTag({ property: 'og:description', content: p.description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    const canonical = ORIGIN + (p.locale === 'en' ? p.paths.en : p.paths.uk);
    this.meta.updateTag({ property: 'og:url', content: canonical });
    if (p.image) this.meta.updateTag({ property: 'og:image', content: ORIGIN + p.image });
    else this.meta.removeTag("property='og:image'");

    this.setLink('canonical', canonical);
    this.setLink('alternate', ORIGIN + p.paths.uk, 'uk');
    this.setLink('alternate', ORIGIN + p.paths.en, 'en');
    this.setLink('alternate', ORIGIN + p.paths.uk, 'x-default');

    this.setJsonLd(p.jsonLd ?? []);
  }

  private setLink(rel: string, href: string, hreflang?: string) {
    const sel = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
    let el = this.doc.head.querySelector<HTMLLinkElement>(sel);
    if (!el) {
      el = this.doc.createElement('link');
      el.rel = rel;
      if (hreflang) el.hreflang = hreflang;
      this.doc.head.appendChild(el);
    }
    el.href = href;
  }

  private setJsonLd(blocks: object[]) {
    this.doc.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
    for (const block of blocks) {
      const s = this.doc.createElement('script');
      s.type = 'application/ld+json';
      s.text = JSON.stringify(block);
      this.doc.head.appendChild(s);
    }
  }
}
```

- [ ] **Step 3:** `shared/reveal.directive.ts` (SSR-safe scroll reveal):

```ts
import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

@Directive({ selector: '[appReveal]', host: { class: 'reveal' } })
export class RevealDirective {
  private readonly el = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => {
      const node = this.el.nativeElement;
      if (!('IntersectionObserver' in window)) {
        node.classList.add('is-visible');
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              node.classList.add('is-visible');
              io.disconnect();
            }
          }
        },
        { threshold: 0.12 },
      );
      io.observe(node);
    });
  }
}
```

- [ ] **Step 4:** `shared/water-card.ts` (+html/scss) — THE signature card of the site:

```ts
import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { WaterListItemDto } from '@fishing/shared';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-water-card',
  imports: [RouterLink, NgOptimizedImage, TranslocoPipe],
  templateUrl: './water-card.html',
  styleUrl: './water-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaterCard {
  private readonly locale = inject(LocaleService);
  water = input.required<WaterListItemDto>();
  readonly link = computed(() =>
    this.locale.link('catalog', this.water().regionSlug, this.water().slug),
  );
  readonly topFish = computed(() => this.water().fishNames.slice(0, 3));
}
```

```html
<a class="card wcard" [routerLink]="link()">
  <div class="wcard__media">
    @if (water().coverCardUrl) {
      <img [ngSrc]="water().coverCardUrl!" fill [alt]="water().name" />
    } @else {
      <div class="wcard__placeholder">🐟</div>
    }
    @if (water().verified) {
      <span class="badge-verified wcard__verified">✓ {{ 'water.verified' | transloco }}</span>
    }
    <span class="wcard__price" [class.wcard__price--free]="!water().isPaid">
      @if (water().isPaid) {
        {{ 'water.from' | transloco }} {{ water().priceFrom }} {{ 'water.uah' | transloco }}
      } @else {
        {{ 'water.free' | transloco }}
      }
    </span>
  </div>
  <div class="wcard__body">
    <h3>{{ water().name }}</h3>
    <p class="wcard__geo">📍 {{ water().regionName }}@if (water().district) {, {{ water().district }}}</p>
    <div class="wcard__fish">
      @for (f of topFish(); track f) {
        <span class="chip">{{ f }}</span>
      }
    </div>
  </div>
</a>
```

```scss
.wcard {
  display: block; color: inherit;
  &__media {
    position: relative; aspect-ratio: 16/10; overflow: hidden;
    img { object-fit: cover; transition: transform 0.4s ease-out; }
  }
  &:hover &__media img { transform: scale(1.05); }
  &__placeholder {
    height: 100%; display: grid; place-items: center; font-size: 3rem;
    background: linear-gradient(135deg, #d7ecf1, #b8dde7);
  }
  &__verified { position: absolute; top: 12px; left: 12px; }
  &__price {
    position: absolute; bottom: 12px; right: 12px;
    background: rgba(4, 34, 44, 0.82); color: #fff; backdrop-filter: blur(6px);
    padding: 5px 12px; border-radius: 999px; font: 600 0.82rem var(--font-body);
    &--free { background: rgba(22, 163, 74, 0.9); }
  }
  &__body { padding: 16px 18px 18px; h3 { font-size: 1.08rem; margin: 0 0 4px; } }
  &__geo { color: var(--muted); font-size: 0.86rem; margin: 0 0 10px; }
  &__fish { display: flex; flex-wrap: wrap; gap: 6px; }
}
```

- [ ] **Step 5:** `shared/breadcrumbs.ts` — input `items: {label: string; link?: string}[]`, renders `nav.crumbs > a|span` separated by «›», muted small text, with BreadcrumbList microdata left to JSON-LD (pages build it). `shared/pager.ts` — inputs `page`, `perPage`, `total`; outputs `pageChange`; prev/next buttons + «N / M» label; hide when one page. (Both ~20 lines each; OnPush; transloco for prev/next labels.)

- [ ] **Step 6: Verify** — `npm run build:web` passes (components compile though unused yet).

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(web): api/seo services, reveal directive, water card and shared ui"`

---

### Task 4: Home page (the WOW landing)

**Files:**
- Modify: `apps/web/src/app/features/home/home.ts|html|scss`

Structure (top→bottom): overlay header (NOT solid) → hero (full-viewport-ish, gradient + animated waves + glass search panel) → featured waters (verified first) → regions grid → fish strip → CTA banner → footer.

- [ ] **Step 1:** `home.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { usePageLocale } from '../../core/use-locale';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { RevealDirective } from '../../shared/reveal.directive';
import { WaterCard } from '../../shared/water-card';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [Header, Footer, TranslocoPipe, WaterCard, RevealDirective, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  readonly locale = usePageLocale();
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  readonly pair = this.locale.pathPair('home');
  readonly regions = toSignal(this.api.regions(), { initialValue: [] });
  readonly fish = toSignal(this.api.fishSpecies(), { initialValue: [] });
  readonly featured = toSignal(this.api.waters({ perPage: 6 }), { initialValue: null });

  searchRegion = '';
  searchFish = '';

  constructor() {
    const uk = this.locale.locale() === 'uk';
    this.seo.apply({
      title: uk
        ? 'FishMap.ua — каталог водойм України для риболовлі'
        : 'FishMap.ua — Ukrainian fishing waters catalog',
      description: uk
        ? 'Знайди озеро, став чи річку для риболовлі: ціни, види риби, зручності, карта. Уся Україна.'
        : 'Find a lake, pond or river for fishing in Ukraine: prices, fish species, amenities, map.',
      paths: this.pair,
      locale: this.locale.locale(),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'FishMap.ua',
          url: 'https://fishmap.ua/',
        },
      ],
    });
  }

  search() {
    const params: Record<string, string> = {};
    if (this.searchFish) params['fish'] = this.searchFish;
    const path = this.searchRegion
      ? this.locale.link('catalog', this.searchRegion)
      : this.locale.link('catalog');
    this.router.navigate([path], { queryParams: params });
  }
}
```

- [ ] **Step 2:** `home.html`:

```html
<app-header [pair]="pair" />
<section class="hero">
  <div class="hero__waves" aria-hidden="true">
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" class="hero__wave hero__wave--1">
      <path d="M0,64 C240,96 480,16 720,48 C960,80 1200,32 1440,64 L1440,120 L0,120 Z" fill="rgba(255,255,255,0.06)"/>
    </svg>
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" class="hero__wave hero__wave--2">
      <path d="M0,80 C260,40 520,100 780,64 C1040,28 1240,88 1440,56 L1440,120 L0,120 Z" fill="rgba(255,255,255,0.1)"/>
    </svg>
  </div>
  <div class="container hero__inner">
    <h1>{{ 'hero.title' | transloco }}</h1>
    <p class="hero__sub">{{ 'hero.subtitle' | transloco }}</p>
    <div class="hero__panel">
      <label>
        <span>{{ 'hero.searchRegion' | transloco }}</span>
        <select [(ngModel)]="searchRegion">
          <option value="">{{ 'hero.anyRegion' | transloco }}</option>
          @for (r of regions(); track r.id) {
            <option [value]="r.slug">{{ r.name }}</option>
          }
        </select>
      </label>
      <label>
        <span>{{ 'hero.searchFish' | transloco }}</span>
        <select [(ngModel)]="searchFish">
          <option value="">{{ 'hero.anyFish' | transloco }}</option>
          @for (f of fish(); track f.id) {
            <option [value]="f.slug">{{ f.name }}</option>
          }
        </select>
      </label>
      <button class="btn btn--accent" (click)="search()">{{ 'hero.cta' | transloco }}</button>
    </div>
    <a [routerLink]="locale.link('map')" class="btn btn--ghost hero__map-link">🗺 {{ 'hero.mapCta' | transloco }}</a>
  </div>
</section>

@if (featured(); as f) {
  @if (f.items.length) {
    <section class="container section" appReveal>
      <h2>{{ 'home.featured' | transloco }}</h2>
      <div class="grid grid--3">
        @for (w of f.items; track w.id) {
          <app-water-card [water]="w" />
        }
      </div>
    </section>
  }
}

<section class="container section" appReveal>
  <h2>{{ 'home.regions' | transloco }}</h2>
  <div class="regions">
    @for (r of regions(); track r.id) {
      <a class="regions__item" [routerLink]="locale.link('catalog', r.slug)">{{ r.name }}</a>
    }
  </div>
</section>

<section class="container section" appReveal>
  <h2>{{ 'home.fishTitle' | transloco }}</h2>
  <div class="fishrow">
    @for (f of fish(); track f.id) {
      <a class="chip fishrow__chip" [routerLink]="locale.link('fish', f.slug)">{{ f.name }}</a>
    }
  </div>
</section>

<section class="container section" appReveal>
  <div class="cta card">
    <div>
      <h2>{{ 'home.ctaTitle' | transloco }}</h2>
      <p>{{ 'home.ctaText' | transloco }}</p>
    </div>
    <a class="btn btn--primary" href="mailto:hello@fishmap.ua">{{ 'home.ctaBtn' | transloco }}</a>
  </div>
</section>
<app-footer />
```

Add `FormsModule` to the component imports for `[(ngModel)]`.

- [ ] **Step 3:** `home.scss`:

```scss
.hero {
  position: relative; overflow: hidden;
  background:
    radial-gradient(1200px 500px at 80% -10%, rgba(14, 116, 144, 0.55), transparent 60%),
    linear-gradient(160deg, var(--hero-from), var(--hero-to));
  color: #fff; padding: 150px 0 120px; text-align: center;

  &__inner { position: relative; z-index: 2; }
  &__sub { font-size: 1.15rem; color: rgba(255, 255, 255, 0.78); max-width: 560px; margin: 0 auto 36px; }

  &__panel {
    display: flex; gap: 14px; align-items: end; justify-content: center; flex-wrap: wrap;
    background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.22);
    backdrop-filter: blur(14px); border-radius: 20px;
    padding: 20px; max-width: 720px; margin: 0 auto;
    label { display: grid; gap: 6px; text-align: left;
      span { font: 600 0.78rem var(--font-body); color: rgba(255, 255, 255, 0.7); text-transform: uppercase; letter-spacing: 0.04em; }
      select {
        min-width: 200px; padding: 11px 14px; border-radius: 12px; border: 0;
        font: 500 0.95rem var(--font-body); color: var(--ink); background: #fff;
      }
    }
  }
  &__map-link { margin-top: 18px; }

  &__waves { position: absolute; inset: auto 0 0; z-index: 1; }
  &__wave { display: block; width: 200%; height: 90px; animation: drift 14s linear infinite; }
  &__wave--2 { margin-top: -60px; animation-duration: 9s; animation-direction: reverse; }
}
@keyframes drift { from { transform: translateX(0); } to { transform: translateX(-50%); } }

.section { padding: 56px 0 0; }
.grid { display: grid; gap: 22px; }
.grid--3 { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }

.regions {
  display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  &__item {
    background: var(--card); border: 1px solid var(--line); border-radius: 12px;
    padding: 12px 16px; color: var(--ink); font-weight: 500;
    transition: border-color 0.15s, transform 0.15s;
    &:hover { border-color: var(--primary); transform: translateY(-2px); color: var(--primary); }
  }
}

.fishrow { display: flex; flex-wrap: wrap; gap: 8px;
  &__chip { font-size: 0.95rem; padding: 8px 16px; transition: transform 0.15s;
    &:hover { transform: translateY(-2px); } }
}

.cta {
  display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap;
  padding: 36px; background: linear-gradient(135deg, #e9f6f9, #f6fbfc);
  p { color: var(--muted); margin: 0; }
}

@media (prefers-reduced-motion: reduce) { .hero__wave { animation: none; } }
```

- [ ] **Step 4: Verify** — build; dev servers; `curl -s http://localhost:4200/ | grep -c 'wcard'` ≥ 3 (SSR renders featured cards); `curl -s http://localhost:4200/ | grep -o 'Автономна Республіка Крим'` → present in regions grid; `curl -s http://localhost:4200/en | grep -o 'Autonomous Republic of Crimea'` → present; view-source has `<script type="application/ld+json">` and hreflang links. Open http://localhost:4200/ in a browser if available and eyeball the hero. Kill servers.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(web): wow home page — hero, featured waters, regions, fish strip"`

---

### Task 5: Catalog page with filters + URL-synced store

**Files:**
- Create: `apps/web/src/app/features/catalog/catalog.store.ts`
- Modify: `apps/web/src/app/features/catalog/catalog.ts|html|scss`

- [ ] **Step 1:** `npm install @ngrx/signals -w apps/web`

- [ ] **Step 2:** `catalog.store.ts`:

```ts
import { inject } from '@angular/core';
import { Paginated, WaterListItemDto } from '@fishing/shared';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { ApiService, WatersFilter } from '../../core/api.service';

interface CatalogState {
  filter: WatersFilter;
  result: Paginated<WaterListItemDto> | null;
  loading: boolean;
}

export const CatalogStore = signalStore(
  withState<CatalogState>({ filter: { page: 1, perPage: 18 }, result: null, loading: false }),
  withMethods((store, api = inject(ApiService)) => ({
    async load(filter: WatersFilter) {
      const merged = { perPage: 18, page: 1, ...filter };
      patchState(store, { filter: merged, loading: true });
      try {
        const result = await firstValueFrom(api.waters(merged));
        patchState(store, { result, loading: false });
      } catch {
        patchState(store, { result: { items: [], total: 0, page: 1, perPage: 18 }, loading: false });
      }
    },
  })),
);
```

- [ ] **Step 3:** `catalog.ts` — reads `:regionSlug` + query params, loads dictionaries for the filter panel, syncs filter→URL via `router.navigate` (queryParams), SEO per region:

```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { WATER_TYPES, WATER_TYPE_LABELS } from '@fishing/shared';
import { ApiService, WatersFilter } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { usePageLocale } from '../../core/use-locale';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { Breadcrumbs } from '../../shared/breadcrumbs';
import { Pager } from '../../shared/pager';
import { WaterCard } from '../../shared/water-card';
import { CatalogStore } from './catalog.store';

@Component({
  selector: 'app-catalog',
  imports: [Header, Footer, TranslocoPipe, WaterCard, Pager, Breadcrumbs, FormsModule],
  providers: [CatalogStore],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPage {
  readonly locale = usePageLocale();
  readonly store = inject(CatalogStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly regions = toSignal(this.api.regions(), { initialValue: [] });
  readonly fishList = toSignal(this.api.fishSpecies(), { initialValue: [] });
  readonly amenityList = toSignal(this.api.amenities(), { initialValue: [] });
  readonly types = WATER_TYPES;
  readonly typeLabels = WATER_TYPE_LABELS;

  readonly regionSlug = toSignal(
    this.route.paramMap.pipe(),
    { initialValue: this.route.snapshot.paramMap },
  );
  readonly pair = computed(() => {
    const slug = this.route.snapshot.paramMap.get('regionSlug');
    return this.locale.pathPair('catalog', slug ? [slug] : []);
  });
  readonly regionName = computed(
    () => this.regions().find((r) => r.slug === this.route.snapshot.paramMap.get('regionSlug'))?.name,
  );

  // local UI state mirrors the filter
  f: WatersFilter = {};

  constructor() {
    this.route.paramMap.subscribe(() => this.initFromUrl());
    this.route.queryParamMap.subscribe(() => this.initFromUrl());
    this.applySeo();
  }

  private initFromUrl() {
    const region = this.route.snapshot.paramMap.get('regionSlug') ?? undefined;
    const q = this.route.snapshot.queryParamMap;
    this.f = {
      region,
      fish: q.get('fish')?.split(',').filter(Boolean) ?? [],
      amenities: q.get('amenities')?.split(',').filter(Boolean) ?? [],
      type: q.get('type') ?? undefined,
      paid: (q.get('paid') as 'true' | 'false') ?? undefined,
      search: q.get('search') ?? undefined,
      page: Number(q.get('page')) || 1,
    };
    this.store.load(this.f);
    this.applySeo();
  }

  apply(patch: Partial<WatersFilter>) {
    const f = { ...this.f, ...patch, page: patch.page ?? 1 };
    this.router.navigate([this.locale.link('catalog', ...(f.region ? [f.region] : []))], {
      queryParams: {
        fish: f.fish?.length ? f.fish.join(',') : null,
        amenities: f.amenities?.length ? f.amenities.join(',') : null,
        type: f.type || null,
        paid: f.paid || null,
        search: f.search || null,
        page: f.page && f.page > 1 ? f.page : null,
      },
      queryParamsHandling: 'merge',
    });
  }

  toggle(list: 'fish' | 'amenities', slug: string) {
    const cur = new Set(this.f[list] ?? []);
    cur.has(slug) ? cur.delete(slug) : cur.add(slug);
    this.apply({ [list]: [...cur] });
  }

  reset() {
    this.router.navigate([this.locale.link('catalog')]);
  }

  private applySeo() {
    const uk = this.locale.locale() === 'uk';
    const region = this.regionName();
    this.seo.apply({
      title: region
        ? uk ? `Водойми: ${region} — FishMap.ua` : `Fishing waters: ${region} — FishMap.ua`
        : uk ? 'Каталог водойм України — FishMap.ua' : 'Waters catalog — FishMap.ua',
      description: uk
        ? 'Платні та безкоштовні водойми: фільтри за областю, рибою, зручностями.'
        : 'Paid and free fishing waters: filter by region, fish and amenities.',
      paths: this.pair(),
      locale: this.locale.locale(),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'FishMap.ua', item: 'https://fishmap.ua/' },
            { '@type': 'ListItem', position: 2, name: region ?? 'Каталог' },
          ],
        },
      ],
    });
  }
}
```

- [ ] **Step 4:** `catalog.html` — solid header, breadcrumbs, `h1` (region name or catalog title) + found-count, two-column layout: left `aside.filters` (region select, fish chips toggle, amenity checkboxes, type select, paid radio, search input with Enter handler, reset btn), right: grid of `app-water-card` / `@if (store.loading())` skeleton cards ×6 / empty state, `app-pager` bottom (`(pageChange)="apply({page: $event})"`). `catalog.scss` — `.layout { display:grid; grid-template-columns: 260px 1fr; gap: 28px; }` collapsing to single column under 880px; filters in a `.card` with sticky top 84px; chips toggled state `background: var(--primary); color:#fff`.

Write the full template/styles following the design language; every interactive element must work (chips toggle, selects call `apply(...)`, search input applies on Enter/blur).

- [ ] **Step 5: Verify** — build; servers up; `curl -s 'http://localhost:4200/vodoymy' | grep -c 'wcard'` → 3; `curl -s 'http://localhost:4200/vodoymy/lvivska-oblast?fish=korop' | grep -c 'wcard'` → 2; `curl -s 'http://localhost:4200/en/waters/lvivska-oblast' | grep -o 'Lviv Oblast' | head -1` → match; empty region check: `curl -s 'http://localhost:4200/vodoymy/kyivska-oblast' | grep -o 'Нічого не знайдено'` → match. Kill servers.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(web): catalog page with url-synced filters and pagination"`

---

### Task 6: Water detail page

**Files:**
- Modify: `apps/web/src/app/features/water-detail/water-detail.ts|html|scss`

- [ ] **Step 1:** `water-detail.ts` — loads by `:waterSlug`; gallery state (active image signal); mini-map via dynamic Leaflet import in `afterNextRender`; SEO with LocalBusiness JSON-LD; 404 → redirect to not-found page state (`router.navigate(['/404-not-found'])` is NOT available — instead render an inline not-found block when API returns 404):

```ts
import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { WaterDetailDto } from '@fishing/shared';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { usePageLocale } from '../../core/use-locale';
import { Footer } from '../../layout/footer';
import { Header } from '../../layout/header';
import { Breadcrumbs } from '../../shared/breadcrumbs';

@Component({
  selector: 'app-water-detail',
  imports: [Header, Footer, TranslocoPipe, Breadcrumbs, NgOptimizedImage, RouterLink],
  templateUrl: './water-detail.html',
  styleUrl: './water-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaterDetailPage {
  readonly locale = usePageLocale();
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  readonly water = signal<WaterDetailDto | null>(null);
  readonly notFound = signal(false);
  readonly active = signal(0);
  readonly mapEl = viewChild<ElementRef<HTMLDivElement>>('miniMap');

  readonly pair = () => {
    const slug = this.route.snapshot.paramMap.get('waterSlug')!;
    const region = this.route.snapshot.paramMap.get('regionSlug')!;
    return this.locale.pathPair('catalog', [region, slug]);
  };

  constructor() {
    const slug = this.route.snapshot.paramMap.get('waterSlug')!;
    this.api.water(slug).subscribe({
      next: (w) => {
        this.water.set(w);
        this.applySeo(w);
      },
      error: () => this.notFound.set(true),
    });

    afterNextRender(async () => {
      // wait for data + element, then mount Leaflet
      const tryMount = async () => {
        const w = this.water();
        const el = this.mapEl()?.nativeElement;
        if (!w || !el || el.dataset['mounted']) return false;
        el.dataset['mounted'] = '1';
        const L = (await import('leaflet')).default ?? (await import('leaflet'));
        const map = L.map(el, { scrollWheelZoom: false }).setView([w.lat, w.lng], 13);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);
        L.marker([w.lat, w.lng]).addTo(map);
        return true;
      };
      if (!(await tryMount())) {
        const t = setInterval(async () => { if (await tryMount()) clearInterval(t); }, 200);
        setTimeout(() => clearInterval(t), 10000);
      }
    });
  }

  private applySeo(w: WaterDetailDto) {
    this.seo.apply({
      title: w.seoTitle ?? `${w.name} — ${w.regionName} | FishMap.ua`,
      description:
        w.seoDescription ?? w.description.slice(0, 155),
      paths: this.pair(),
      locale: this.locale.locale(),
      image: w.media[0]?.urlCard ?? null,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: w.name,
          description: w.description.slice(0, 300),
          telephone: w.phone ?? undefined,
          url: `https://fishmap.ua${this.pair().uk}`,
          geo: { '@type': 'GeoCoordinates', latitude: w.lat, longitude: w.lng },
          address: { '@type': 'PostalAddress', addressRegion: w.regionName, addressCountry: 'UA' },
          image: w.media.map((m) => `https://fishmap.ua${m.urlFull}`),
        },
      ],
    });
  }
}
```

- [ ] **Step 2:** Leaflet install: `npm install leaflet leaflet.markercluster -w apps/web && npm install -D @types/leaflet @types/leaflet.markercluster -w apps/web`. Add leaflet css to `apps/web/angular.json` build options styles array: `"node_modules/leaflet/dist/leaflet.css", "node_modules/leaflet.markercluster/dist/MarkerCluster.css", "node_modules/leaflet.markercluster/dist/MarkerCluster.Default.css"` (after src/styles.scss). Add `"leaflet", "leaflet.markercluster"` to `allowedCommonJsDependencies`.

- [ ] **Step 3:** `water-detail.html` — solid header; `@if (notFound())` → inline 404 block (emoji 🎣, notFound.title, link home); `@else if (water(); as w)` → breadcrumbs (home → region catalog → name); hero row: gallery (main image `ngSrc` w.media[active()].urlFull or placeholder; thumb strip `@for` sets `active.set($index)`), sticky aside card: price block (isPaid → `priceFrom–priceTo грн` + priceNote; else FREE badge), verified badge, water type chip (`typeLabels`), area (`areaHa` га), contacts (phone `tel:` link, website `href` external), «На карті» anchor; sections below: description (multiline, `white-space: pre-line`), fish chips (link each to fish page via `locale.link('fish', f.slug)`), amenities chips, rules block (pre-line, only when present), mini-map `<div #miniMap class="minimap"></div>`. `water-detail.scss` — gallery `aspect-ratio: 16/9; border-radius: var(--radius)`, thumbs 72px squares with active outline `2px solid var(--primary)`, aside `position: sticky; top: 84px`, `.minimap { height: 320px; border-radius: var(--radius); overflow: hidden; }`, layout grid `1fr 340px` collapsing under 920px.

- [ ] **Step 4: Verify** — build; servers; `curl -s http://localhost:4200/vodoymy/lvivska-oblast/ozero-navariia | grep -o 'Озеро Наварія' | head -1` → match; same page contains `application/ld+json` with `LocalBusiness` and `GeoCoordinates`; `curl -s http://localhost:4200/en/waters/lvivska-oblast/ozero-navariia | grep -o 'Navaria Lake' | head -1` → match; unknown slug `curl -s http://localhost:4200/vodoymy/lvivska-oblast/nope | grep -o 'Сторінку не знайдено'` → match. Kill servers.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(web): water detail page with gallery, mini-map and LocalBusiness jsonld"`

---

### Task 7: Full-screen map page

**Files:**
- Modify: `apps/web/src/app/features/map/map-page.ts|html|scss`

- [ ] **Step 1:** `map-page.ts` — full-viewport Leaflet with markercluster; pins from `api.mapPins()`; filter bar (region/fish/paid selects reuse dictionaries); popup = name + price badge + link to detail; SSR renders a placeholder `div` and the map mounts in `afterNextRender`:

```ts
import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MapPinDto } from '@fishing/shared';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { usePageLocale } from '../../core/use-locale';
import { Header } from '../../layout/header';

@Component({
  selector: 'app-map-page',
  imports: [Header, TranslocoPipe, FormsModule],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPage {
  readonly locale = usePageLocale();
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly pair = this.locale.pathPair('map');
  readonly regions = toSignal(this.api.regions(), { initialValue: [] });
  readonly fishList = toSignal(this.api.fishSpecies(), { initialValue: [] });
  readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('map');

  region = '';
  fish = '';
  paid = '';

  private map: import('leaflet').Map | null = null;
  private cluster: import('leaflet').MarkerClusterGroup | null = null;
  private L: typeof import('leaflet') | null = null;

  constructor() {
    const uk = this.locale.locale() === 'uk';
    this.seo.apply({
      title: uk ? 'Карта водойм України — FishMap.ua' : 'Fishing waters map — FishMap.ua',
      description: uk ? 'Усі водойми каталогу на одній карті.' : 'All catalog waters on one map.',
      paths: this.pair,
      locale: this.locale.locale(),
    });

    afterNextRender(async () => {
      const leaflet = await import('leaflet');
      await import('leaflet.markercluster');
      this.L = leaflet;
      this.map = leaflet
        .map(this.mapEl().nativeElement)
        .setView([49.0, 31.0], 6);
      leaflet
        .tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        })
        .addTo(this.map);
      await this.refresh();
    });
  }

  async refresh() {
    if (!this.L || !this.map) return;
    const pins = await firstValueFrom(
      this.api.mapPins({
        region: this.region || undefined,
        fish: this.fish ? [this.fish] : undefined,
        paid: (this.paid as 'true' | 'false') || undefined,
      }),
    );
    this.cluster?.remove();
    this.cluster = this.L.markerClusterGroup();
    for (const p of pins) {
      const m = this.L.marker([p.lat, p.lng]);
      m.bindPopup(this.popupHtml(p));
      this.cluster.addLayer(m);
    }
    this.map.addLayer(this.cluster);
  }

  private popupHtml(p: MapPinDto): string {
    const seg = this.locale.locale() === 'en' ? '/en/waters' : '/vodoymy';
    // region slug is not in MapPinDto — link via catalog search by slug is not possible;
    // detail URLs need region. Build a region-less fallback: use the uk catalog link with search.
    return `<strong>${p.name}</strong><br>${p.isPaid ? '₴' : 'безкоштовно'}<br><a href="${seg}?search=${encodeURIComponent(p.name)}">→</a>`;
  }
}
```

**Wait — popup links.** `MapPinDto` lacks `regionSlug`, so a direct detail URL can't be built. DO THIS INSTEAD: extend the API pin shape — it's a 2-line change in Plan-1 code you're allowed to make here:
- `packages/shared/src/index.ts`: add `regionSlug: string;` to `MapPinDto`.
- `apps/api/src/waters/waters.service.ts` `mapPins`: add `region: { select: { slug: true } }` to the select.
- `apps/api/src/waters/waters.mapper.ts` `toPin`: accept `region: { slug: string }` in the Pick type (adjust signature: `w: Pick<Water, 'id'|'slug'|'name'|'nameEn'|'lat'|'lng'|'isPaid'> & { region: { slug: string } }`) and return `regionSlug: w.region.slug`.
Then `popupHtml` builds a real link: `${seg}/${p.regionSlug}/${p.slug}` with seg = locale catalog segment, and rebuild shared (`npm run build:shared`) + verify api still compiles (`npm run build:api`). Report this as an approved cross-cutting change.

- [ ] **Step 2:** `map-page.html`:

```html
<app-header [solid]="true" [pair]="pair" />
<div class="mappage">
  <div class="mappage__bar container">
    <select [(ngModel)]="region" (change)="refresh()">
      <option value="">{{ 'hero.anyRegion' | transloco }}</option>
      @for (r of regions(); track r.id) { <option [value]="r.slug">{{ r.name }}</option> }
    </select>
    <select [(ngModel)]="fish" (change)="refresh()">
      <option value="">{{ 'hero.anyFish' | transloco }}</option>
      @for (f of fishList(); track f.id) { <option [value]="f.slug">{{ f.name }}</option> }
    </select>
    <select [(ngModel)]="paid" (change)="refresh()">
      <option value="">{{ 'catalog.any' | transloco }}</option>
      <option value="false">{{ 'catalog.free' | transloco }}</option>
      <option value="true">{{ 'catalog.paidOnly' | transloco }}</option>
    </select>
  </div>
  <div #map class="mappage__map"></div>
</div>
```

`map-page.scss`:

```scss
.mappage {
  &__bar {
    display: flex; gap: 10px; padding: 14px 20px; flex-wrap: wrap;
    select { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line); font: 500 0.92rem var(--font-body); background: #fff; }
  }
  &__map { height: calc(100vh - 130px); min-height: 420px; }
}
```

(No footer on the map page — full-bleed map.)

- [ ] **Step 3: Verify** — `npm run build:shared && npm run build:api && npm run build:web` all pass (cross-cutting MapPinDto change!); api+web dev servers; `curl -s 'http://localhost:3000/api/waters/map' | grep -o 'regionSlug' | head -1` → present; page SSR: `curl -s http://localhost:4200/karta | grep -o 'mappage__map'` → present. Kill servers.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(web): full-screen clustered map page; add regionSlug to map pins"`

---

### Task 8: Fish landing pages (/ryba/:slug)

**Files:**
- Modify: `apps/web/src/app/features/fish/fish-page.ts|html|scss`

- [ ] **Step 1:** `fish-page.ts` — resolves the fish by slug from `api.fishSpecies()`, loads waters filtered by that fish (reuses `app-water-card` grid + `app-pager`), mini-hero with the fish name, SEO + BreadcrumbList JSON-LD, `pair = locale.pathPair('fish', [slug])`. Load via `api.waters({ fish: [slug], page })`. Full component analogous to catalog but without the filter sidebar (~80 lines TS + simple template: solid header, hero band `background: linear-gradient(160deg, var(--hero-from), var(--hero-to))` with `h1 = t('fishPage.title', {fish: name})`, grid, pager, footer).

- [ ] **Step 2: Verify** — build; servers; `curl -s http://localhost:4200/ryba/shchuka | grep -c 'wcard'` → 2 (Наварія + Дністер mають щуку); `curl -s http://localhost:4200/en/fish/shchuka | grep -o 'Where to catch: Pike' | head -1` → match. Kill servers.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat(web): fish landing pages"`

---

### Task 9: robots.txt, 404 polish, final SSR verification

**Files:**
- Create: `apps/web/public/robots.txt`
- Modify: `apps/web/src/app/features/not-found/not-found.ts|html|scss` (полірування), any rough edges found

- [ ] **Step 1:** `apps/web/public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /admin
Sitemap: https://fishmap.ua/sitemap.xml
```

- [ ] **Step 2:** Not-found page: dark hero-style full-screen block, big 🎣, `notFound.title/text`, btn home. Set `<meta name="robots" content="noindex">` via Meta service in its constructor.

- [ ] **Step 3:** Full verification sweep (api + web dev servers):
- `npm run build` (root, all three) — clean.
- view-source checks on `/`, `/vodoymy`, `/vodoymy/lvivska-oblast/ozero-navariia`, `/en`, `/karta`, `/ryba/shchuka`: each contains correct `<title>`, `meta description`, `link rel=canonical`, three hreflang links, and (home/catalog/detail) JSON-LD.
- `curl -s http://localhost:4200/robots.txt` → the file above.
- Hydration sanity: `curl -s http://localhost:4200/ | grep -c 'ngh='` ≥ 1 (hydration annotations present).
- Mobile spot-check via narrow viewport in a browser if available; otherwise confirm CSS breakpoints exist (grep `@media` in catalog/detail/home scss).

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(web): robots.txt, 404 polish and ssr verification fixes"`

---

## Done criteria for this plan

- `npm run build` (root) passes from clean.
- All view-source checks of Task 9 pass — pages are fully SSR-rendered with i18n content, canonical/hreflang and JSON-LD.
- uk pages live at `/`, `/vodoymy[/...]`, `/karta`, `/ryba/...`; en mirrors at `/en`, `/en/waters[/...]`, `/en/map`, `/en/fish/...`; lang switcher flips between them on every page.
- Map page clusters pins and popups link to detail pages.
- Zero `*.spec.ts` files in apps/web/src.

## What comes next (separate plans)

- **Plan 3:** admin UI (login, waters table, form with map picker, media manager).
- **Plan 4:** production deploy — see hard requirements recorded in Plan 1 doc (NODE_ENV, rate-limit, helmet, image pinning) + Caddy routing `/api`, `/uploads`, `/sitemap.xml` → api. Also: the Angular SSR server rejects non-allowlisted Host headers — set the production host allowlist (NG_ALLOWED_HOSTS or equivalent) for the web container.
