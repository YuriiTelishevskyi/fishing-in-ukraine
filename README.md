# Fishing in Ukraine

Каталог водойм України для рибалок. Монорепа: Angular SSR (web) + NestJS (api) + PostgreSQL.
Двомовний контент: українська (основна) + англійська (опційна, з фолбеком).

## Структура

- `apps/web` — Angular 20 + SSR (публічний сайт і адмінка)
- `apps/api` — NestJS + Prisma (REST API, медіа, sitemap)
- `packages/shared` — спільні TypeScript-типи
- `docs/superpowers/specs` — дизайн-документи, `docs/superpowers/plans` — плани реалізації

## Локальний запуск

Вимоги: Node ≥ 20, Docker.

```bash
npm install
cp apps/api/.env.example apps/api/.env   # заповнити JWT_SECRET і ADMIN_PASSWORD_HASH
npm run db:up                            # PostgreSQL у Docker (хост-порт 5433)
npm run build:shared
cd apps/api && npx prisma migrate dev && npx prisma db seed && cd ../..
npm run dev:api                          # API на :3000
npm run dev:web                          # Angular на :4200
```

Хеш пароля адміна: `node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'пароль'`
(виконувати з кореня репо). JWT-секрет: `openssl rand -hex 32`.

## API (огляд)

- Публічні: `GET /api/waters` (фільтри + пагінація), `GET /api/waters/map`, `GET /api/waters/:slug`, `GET /api/regions|fish-species|amenities` — усі приймають `?lang=uk|en`
- Адмін (cookie-JWT): `POST /api/admin/login|logout`, CRUD `/api/admin/waters`, медіа-завантаження, створення позицій довідників
- SEO: `GET /sitemap.xml` (двомовний, з hreflang)

## Корисні команди

- `npm run build` — збірка всіх пакетів (shared → api → web)
- `cd apps/api && npx prisma studio` — переглянути БД
