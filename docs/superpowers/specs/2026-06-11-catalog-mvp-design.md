# Fishing in Ukraine — Дизайн першого циклу: каталог водойм (MVP)

**Дата:** 2026-06-11
**Статус:** на рецензії

## 1. Мета і контекст

Платформа «каталог водойм України для рибалок» із довгостроковою ціллю стати
«Booking для рибалок». Перший цикл — **публічний SEO-каталог водойм** із картою,
фільтрами та мінімальною адмінкою для внесення даних. Контент стартує зі
Львівської області (100–200 водойм вручну), але модель даних — всеукраїнська.

Головна метрика успіху циклу: сайт у продакшні, водойми вносяться через адмінку,
сторінки індексуються Google (SSR, sitemap, Schema.org).

### Не входить у перший цикл (свідомо)

- Акаунти користувачів, реєстрація, логін (крім одного адмін-логіна)
- Відгуки та рейтинги
- Кабінет власника водойми, Premium-розміщення
- Бронювання, платежі
- Блог (структура `/blog/:slug` зарезервована, реалізація — наступний цикл)
- Мобільний застосунок, AI-функції, прогноз кльову
- Redis, BullMQ, черги — додаються лише коли з'явиться робота для них

## 2. Архітектура

Монорепа на **npm workspaces** (без Nx — на два застосунки достатньо):

```
fishing-in-ukraine/
├─ apps/
│  ├─ web/            # Angular 20 SSR (існуючий скафолд переїжджає сюди)
│  └─ api/            # NestJS + Prisma
├─ packages/
│  └─ shared/         # DTO-інтерфейси, enum-и (типи водойм, статуси)
├─ docker-compose.yml # локально: PostgreSQL; прод: повний стек
└─ package.json       # workspaces, спільні скрипти
```

- **apps/web** — Angular 20.3 + SSR (`@angular/ssr`), той самий скафолд, що вже в
  репо. Оновлення до Angular 21 — окремий необов'язковий крок пізніше.
- **apps/api** — NestJS + Prisma + PostgreSQL 16.
- **packages/shared** — спільні TypeScript-типи для web і api.

Деплой: два Node-процеси (web SSR, api) + Postgres за реверс-проксі.

## 3. Модель даних (Prisma)

### Water — центральна сутність

| Поле | Тип | Примітка |
|---|---|---|
| id | uuid | |
| slug | string, unique | для URL |
| name | string | |
| description | text | |
| regionId | FK → Region | |
| district | string? | район/громада |
| lat, lng | float | |
| areaHa | float? | площа в га |
| waterType | enum | LAKE / POND / RIVER / RESERVOIR / FISHING_COMPLEX |
| isPaid | boolean | |
| priceFrom, priceTo | int? | грн |
| priceNote | string? | «вхід 300, доба 700» |
| phone, website | string? | |
| rules | text? | правила водойми |
| verified | boolean | бейдж «перевірена» |
| status | enum | DRAFT / PUBLISHED / ARCHIVED |
| seoTitle, seoDescription | string? | override; за замовчуванням — шаблон |
| createdAt, updatedAt | datetime | |

### Довідники

- **Region** — 24 області + Київ: `id`, `slug`, `name`. Сідається seed-скриптом.
- **FishSpecies** — `id`, `slug`, `name`. Сід ~20 базових видів.
- **Amenity** — `id`, `slug`, `name`, `icon` (альтанки, ночівля, човни, прокат,
  парковка…). Сід ~10 позицій.
- Join-таблиці: **WaterFish** (waterId, fishId), **WaterAmenity** (waterId, amenityId).

### Media

`id`, `waterId` (FK, cascade delete), `url`, `sortOrder`, `alt`.
Перше фото за sortOrder — обкладинка картки та OG-image.

Таблиць `User`, `Review`, `Booking`, `OwnerSubscription` у цьому циклі **немає**.
Prisma-міграції дешеві; схема нічого не блокує для їх додавання у V2.

## 4. API (NestJS)

Модулі: `waters`, `dictionaries`, `media`, `admin-auth`, `seo`.

### Публічні ендпоїнти

| Метод і шлях | Призначення |
|---|---|
| `GET /api/waters` | список; фільтри `region`, `fish`, `amenities`, `type`, `paid`, `search`; пагінація |
| `GET /api/waters/map` | легкі піни для карти (id, slug, name, lat, lng, isPaid) з тими ж фільтрами |
| `GET /api/waters/:slug` | повні дані сторінки водойми (тільки PUBLISHED) |
| `GET /api/regions`, `/api/fish-species`, `/api/amenities` | довідники для фільтрів |
| `GET /sitemap.xml` | генерується з PUBLISHED-водойм, регіонів і видів риби |

### Адмінські ендпоїнти (`/api/admin/*`, JWT-guard)

- `POST /api/admin/login` — креденшали з env (`ADMIN_LOGIN`, `ADMIN_PASSWORD_HASH`),
  відповідь — httpOnly cookie з підписаним JWT. Жодної таблиці користувачів.
- CRUD водойм (включно з DRAFT), зміна статусу.
- Легкий CRUD довідників (додати вид риби / зручність).
- `POST /api/admin/waters/:id/media` — multipart; `PATCH` для перестановки;
  `DELETE` для видалення.

### Медіа

Завантажене фото обробляє **sharp**: webp у трьох розмірах (thumb / card / full).
Зберігання — локальна тека `uploads/` (docker volume) за абстракцією
`StorageService`, щоб пізніше замінити на S3/R2 без переписування коду.
Віддача — статикою через реверс-проксі з довгим Cache-Control.

Валідація DTO — class-validator в api; інтерфейси цих DTO — у `packages/shared`.

## 5. Фронтенд (Angular)

### URL-структура

| Маршрут | Сторінка |
|---|---|
| `/` | головна: пошук, популярні водойми, посилання на області |
| `/vodoymy` | весь каталог із фільтрами |
| `/vodoymy/:regionSlug` | водойми області — головні SEO-сторінки |
| `/vodoymy/:regionSlug/:waterSlug` | сторінка водойми |
| `/ryba/:fishSlug` | лендинг по виду риби («де ловити щуку») |
| `/karta` | повноекранна карта з фільтрами |
| `/admin/**` | lazy-чанк адмінки, noindex |

Фільтри — у query-параметрах; canonical вказує на чистий шлях, щоб не плодити
дублікати в індексі.

### Структура коду

```
apps/web/src/app/
├─ core/        # ApiClient-сервіси, SeoService, config, interceptors
├─ shared/      # картка водойми, бейджі, пайпи (ціна), дрібні UI-компоненти
└─ features/
   ├─ home/
   ├─ catalog/       # список + фільтри; @ngrx/signals signalStore
   ├─ water-detail/
   ├─ map/           # Leaflet + markercluster, client-only
   └─ admin/         # lazy: login, таблиця водойм, форма, медіа
```

- **Стан:** `@ngrx/signals` signalStore для каталогу (фільтри ↔ URL ↔
  результати); решта — сервіси на signals.
- **UI:** PrimeNG (найбільший виграш в адмінці: таблиці, форми) + власна легка
  SCSS-тема публічної частини; публічні сторінки мають проходити Core Web Vitals.
- **Карта:** Leaflet + OpenStreetMap + markercluster. SSR рендерить плейсхолдер;
  ініціалізація у `afterNextRender` із dynamic import. На сторінці водойми —
  маленька карта-прев'ю з одним пін-ом.

### SSR і SEO

- SSR на кожен запит; hydration + `TransferState` (`provideClientHydration`),
  щоб API не викликався вдруге на клієнті.
- `SeoService`: title/description-шаблони, canonical, OG-теги (перше фото
  водойми), JSON-LD: `LocalBusiness` (сторінка водойми), `BreadcrumbList`
  (скрізь), `ItemList` (списки).
- `robots.txt` — статичний, `/admin` заборонений; `sitemap.xml` проксюється на api.

## 6. Адмінка (UX)

- `/admin/login` — форма логіна → cookie.
- `/admin/waters` — таблиця PrimeNG: пошук, фільтр за статусом і областю.
- `/admin/waters/:id` — форма: основні поля, вибір координат кліком по
  Leaflet-карті, мультиселекти риби/зручностей, textarea правил, SEO-override.
- Блок медіа: drag-drop завантаження, перестановка порядку, видалення.

## 7. Деплой і середовища

- **Локально:** `docker compose up postgres` + `npm run dev` (web і api
  паралельно, проксі `/api` → localhost:3000).
- **Прод (VPS):** docker compose — Caddy (TLS, реверс-проксі, статика uploads),
  web (SSR), api, postgres; volume для uploads і даних Postgres.
- **CI (GitHub Actions):** на push у main — збірка обох застосунків; деплой —
  build образів і `compose up` через SSH. Мінімальний, без оркестрації.
- Аналітика при запуску: Plausible або GA4 + Google Search Console.

## 8. Верифікація

За рішенням користувача **юніт-тести (Jest/Karma) під час розробки не пишуться**;
покриття тестами — окрема фінальна фаза проєкту.

У процесі розробки верифікація — це:
- `ng build` / `nest build` без помилок на кожному кроці;
- ручна перевірка сторінок у браузері (зокрема view-source для SSR);
- перевірка sitemap.xml, JSON-LD (Rich Results Test) перед запуском.

Angular-артефакти генеруються з `--skip-tests`.

## 9. Наступні цикли (поза цим дизайном)

1. Блог (статті — основний SEO-двигун) + сторінки `/ryba/*` із контентом.
2. Відгуки + акаунти користувачів.
3. Кабінет власника + Premium-розміщення (перша монетизація).
4. Бронювання + платежі.
