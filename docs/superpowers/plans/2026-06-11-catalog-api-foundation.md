# Catalog MVP — Plan 1 of 4: Monorepo + API Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the repo into an npm-workspaces monorepo and build the complete NestJS + Prisma + PostgreSQL API for the waters catalog (public endpoints, admin auth, waters CRUD, media upload, sitemap).

**Architecture:** Monorepo with `apps/web` (existing Angular 20 SSR scaffold, untouched in this plan), `apps/api` (NestJS 11 + Prisma 6 + PostgreSQL 16 in Docker), `packages/shared` (compiled CJS package with DTO types shared by both apps). Single admin user via env credentials + JWT in an httpOnly cookie. Media stored on local disk behind a `StorageService` abstraction. Content is bilingual: Ukrainian is primary, English is optional per record (`*En` columns) with server-side fallback — public endpoints take `?lang=uk|en`, admin payloads carry both languages.

**Tech Stack:** npm workspaces, NestJS 11, Prisma 6, PostgreSQL 16 (Docker), class-validator, @nestjs/jwt, bcryptjs, sharp, TypeScript ~5.9.

**Spec:** `docs/superpowers/specs/2026-06-11-catalog-mvp-design.md` (this plan covers spec §2 Architecture, §3 Data model, §4 API, plus local Docker from §7). Plans 2–4 (written later) cover public frontend, admin UI, and production deploy.

**IMPORTANT — no tests:** Per explicit user decision, do NOT write Jest/Karma/unit tests in this project. Test coverage is a separate final phase. Verification in every task = exact shell commands with expected output. Do not scaffold `*.spec.ts` files; delete any that generators create.

**Conventions for all tasks:**
- Run all commands from the repo root unless a task says otherwise.
- Requires: Node ≥ 20, Docker with compose plugin.
- Commit at the end of every task with the exact message given.

---

### Task 1: Restructure into npm-workspaces monorepo

The current repo root IS the Angular app. Move it into `apps/web`, create a root workspace `package.json`.

**Files:**
- Move: `src/`, `public/`, `angular.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `package.json` → `apps/web/`
- Create: `package.json` (new root), `.gitignore` (replace)
- Delete: `package-lock.json`, `node_modules/`

- [ ] **Step 1: Move the Angular app**

```bash
mkdir -p apps/web packages
git mv src public angular.json tsconfig.json tsconfig.app.json tsconfig.spec.json apps/web/
git mv package.json apps/web/package.json
git rm package-lock.json
rm -rf node_modules
```

- [ ] **Step 2: Edit `apps/web/package.json`** — rename the package and drop the prettier block (it moves to root). Replace the top of the file so it reads:

```json
{
  "name": "@fishing/web",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "serve:ssr:fishing-in-ukraine": "node dist/fishing-in-ukraine/server/server.mjs"
  },
  "private": true,
```

Keep the existing `dependencies` and `devDependencies` exactly as they are. Remove the `"test": "ng test"` script (no tests in this project) and the `"prettier"` block.

- [ ] **Step 3: Write the new root `package.json`**

```json
{
  "name": "fishing-in-ukraine",
  "version": "0.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build:shared": "npm run build -w packages/shared",
    "build:api": "npm run build -w apps/api",
    "build:web": "npm run build -w apps/web",
    "build": "npm run build:shared && npm run build:api && npm run build:web",
    "dev:api": "npm run start:dev -w apps/api",
    "dev:web": "npm run start -w apps/web",
    "db:up": "docker compose up -d postgres"
  },
  "prettier": {
    "printWidth": 100,
    "singleQuote": true,
    "overrides": [
      {
        "files": "*.html",
        "options": {
          "parser": "angular"
        }
      }
    ]
  }
}
```

Note: `build:shared`/`build:api`/`db:up` reference workspaces created in Tasks 2–4; that's fine — they aren't run until then.

- [ ] **Step 4: Replace `.gitignore`** with:

```gitignore
# dependencies
node_modules/

# build outputs
dist/
.angular/

# env & secrets
.env

# uploaded media (api)
apps/api/uploads/

# IDE / OS
.idea/
.DS_Store

# logs
*.log
npm-debug.log*
```

- [ ] **Step 5: Install and verify the web app still builds**

```bash
npm install
npm run build -w apps/web
```

Expected: install succeeds creating a root `package-lock.json`; build ends with `Application bundle generation complete.` and `apps/web/dist/fishing-in-ukraine/` exists.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: restructure into npm workspaces monorepo"
```

---

### Task 2: Shared types package

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@fishing/shared",
  "version": "0.0.1",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "devDependencies": {
    "typescript": "~5.9.2"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "declaration": true,
    "outDir": "dist",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/shared/src/index.ts`**

```ts
export type WaterType = 'LAKE' | 'POND' | 'RIVER' | 'RESERVOIR' | 'FISHING_COMPLEX';
export const WATER_TYPES: WaterType[] = ['LAKE', 'POND', 'RIVER', 'RESERVOIR', 'FISHING_COMPLEX'];
export const WATER_TYPE_LABELS: Record<WaterType, string> = {
  LAKE: 'Озеро',
  POND: 'Став',
  RIVER: 'Річка',
  RESERVOIR: 'Водосховище',
  FISHING_COMPLEX: 'Риболовний комплекс',
};

export type WaterStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export const WATER_STATUSES: WaterStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export type Locale = 'uk' | 'en';
export const LOCALES: Locale[] = ['uk', 'en'];
export const DEFAULT_LOCALE: Locale = 'uk';

export interface RegionDto {
  id: number;
  slug: string;
  name: string;
}

export interface FishSpeciesDto {
  id: number;
  slug: string;
  name: string;
}

export interface AmenityDto {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
}

export interface MediaDto {
  id: string;
  urlThumb: string;
  urlCard: string;
  urlFull: string;
  alt: string | null;
  sortOrder: number;
}

export interface WaterListItemDto {
  id: string;
  slug: string;
  name: string;
  regionSlug: string;
  regionName: string;
  district: string | null;
  lat: number;
  lng: number;
  waterType: WaterType;
  isPaid: boolean;
  priceFrom: number | null;
  priceTo: number | null;
  verified: boolean;
  fishNames: string[];
  coverThumbUrl: string | null;
  coverCardUrl: string | null;
}

export interface WaterDetailDto extends WaterListItemDto {
  description: string;
  areaHa: number | null;
  priceNote: string | null;
  phone: string | null;
  website: string | null;
  rules: string | null;
  status: WaterStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  nameEn: string | null;
  descriptionEn: string | null;
  rulesEn: string | null;
  priceNoteEn: string | null;
  seoTitleEn: string | null;
  seoDescriptionEn: string | null;
  fish: FishSpeciesDto[];
  amenities: AmenityDto[];
  media: MediaDto[];
  createdAt: string;
  updatedAt: string;
}

export interface MapPinDto {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  isPaid: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}
```

- [ ] **Step 4: Build and verify**

```bash
npm install
npm run build -w packages/shared
ls packages/shared/dist
```

Expected: `index.js  index.d.ts` listed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add @fishing/shared types package"
```

---

### Task 3: NestJS app scaffold with health endpoint

Hand-written minimal Nest app (no `nest new` — it brings its own git/lockfile and spec files).

**Files:**
- Create: `apps/api/package.json`, `apps/api/nest-cli.json`, `apps/api/tsconfig.json`, `apps/api/tsconfig.build.json`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/health.controller.ts`

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
  "name": "@fishing/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "prisma db seed"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@fishing/shared": "*",
    "@nestjs/common": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/jwt": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/serve-static": "^5.0.0",
    "@prisma/client": "^6.0.0",
    "bcryptjs": "^3.0.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "cookie-parser": "^1.4.7",
    "reflect-metadata": "^0.2.2",
    "rxjs": "~7.8.0",
    "sharp": "^0.34.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@types/cookie-parser": "^1.4.7",
    "@types/express": "^5.0.1",
    "@types/multer": "^1.4.12",
    "@types/node": "^20.17.19",
    "prisma": "^6.0.0",
    "ts-node": "^10.9.2",
    "typescript": "~5.9.2"
  }
}
```

- [ ] **Step 2: Create `apps/api/nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 3: Create `apps/api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": false,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "esModuleInterop": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "strictPropertyInitialization": false
  }
}
```

- [ ] **Step 4: Create `apps/api/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "prisma"]
}
```

- [ ] **Step 5: Create `apps/api/src/main.ts`**

```ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', { exclude: ['sitemap.xml'] });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 6: Create `apps/api/src/health.controller.ts`**

```ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok' };
  }
}
```

- [ ] **Step 7: Create `apps/api/src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 8: Install, run, verify**

```bash
npm install
npm run build:shared
npm run dev:api
```

In a second terminal:

```bash
curl -s http://localhost:3000/api/health
```

Expected: `{"status":"ok"}`. Stop the dev server afterwards.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(api): scaffold NestJS app with health endpoint"
```

---

### Task 4: Docker Compose (PostgreSQL) + env files

**Files:**
- Create: `docker-compose.yml`, `apps/api/.env.example`, `apps/api/.env` (NOT committed — already gitignored)

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: fishing
      POSTGRES_PASSWORD: fishing
      POSTGRES_DB: fishing_db
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: Create `apps/api/.env.example`**

```bash
DATABASE_URL="postgresql://fishing:fishing@localhost:5432/fishing_db?schema=public"
JWT_SECRET="change-me-long-random-string"
ADMIN_LOGIN="admin"
# Generate with: node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'your-password'
ADMIN_PASSWORD_HASH=""
SITE_BASE_URL="http://localhost:4200"
SEED_DEMO="1"
PORT=3000
```

- [ ] **Step 3: Create the real `apps/api/.env`** — copy the example and fill in real values:

```bash
cp apps/api/.env.example apps/api/.env
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'admin12345'
```

Put the printed hash into `ADMIN_PASSWORD_HASH` in `apps/api/.env` and set `JWT_SECRET` to any long random string (e.g. output of `openssl rand -hex 32`). Local dev password is `admin12345`.

- [ ] **Step 4: Start and verify PostgreSQL**

```bash
docker compose up -d postgres
docker compose exec postgres pg_isready -U fishing
```

Expected: `... accepting connections`.

- [ ] **Step 5: Commit** (verify `git status` does NOT list `apps/api/.env`)

```bash
git add docker-compose.yml apps/api/.env.example
git commit -m "chore: add postgres docker compose and env example"
```

---

### Task 5: Prisma schema, first migration, PrismaService

**Files:**
- Create: `apps/api/prisma/schema.prisma`, `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/prisma/prisma.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create `apps/api/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum WaterType {
  LAKE
  POND
  RIVER
  RESERVOIR
  FISHING_COMPLEX
}

enum WaterStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model Region {
  id     Int     @id @default(autoincrement())
  slug   String  @unique
  name   String
  nameEn String
  waters Water[]
}

model FishSpecies {
  id     Int         @id @default(autoincrement())
  slug   String      @unique
  name   String
  nameEn String
  waters WaterFish[]
}

model Amenity {
  id     Int            @id @default(autoincrement())
  slug   String         @unique
  name   String
  nameEn String
  icon   String?
  waters WaterAmenity[]
}

model Water {
  id             String         @id @default(uuid())
  slug           String         @unique
  name           String
  nameEn         String?
  description    String
  descriptionEn  String?
  region         Region         @relation(fields: [regionId], references: [id])
  regionId       Int
  district       String?
  lat            Float
  lng            Float
  areaHa         Float?
  waterType      WaterType
  isPaid         Boolean        @default(false)
  priceFrom      Int?
  priceTo        Int?
  priceNote      String?
  priceNoteEn    String?
  phone          String?
  website        String?
  rules          String?
  rulesEn        String?
  verified       Boolean        @default(false)
  status         WaterStatus    @default(DRAFT)
  seoTitle       String?
  seoTitleEn     String?
  seoDescription String?
  seoDescriptionEn String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  fish           WaterFish[]
  amenities      WaterAmenity[]
  media          Media[]

  @@index([regionId, status])
  @@index([status])
}

model WaterFish {
  water   Water       @relation(fields: [waterId], references: [id], onDelete: Cascade)
  waterId String
  fish    FishSpecies @relation(fields: [fishId], references: [id], onDelete: Cascade)
  fishId  Int

  @@id([waterId, fishId])
}

model WaterAmenity {
  water     Water   @relation(fields: [waterId], references: [id], onDelete: Cascade)
  waterId   String
  amenity   Amenity @relation(fields: [amenityId], references: [id], onDelete: Cascade)
  amenityId Int

  @@id([waterId, amenityId])
}

model Media {
  id        String   @id @default(uuid())
  water     Water    @relation(fields: [waterId], references: [id], onDelete: Cascade)
  waterId   String
  url       String
  sortOrder Int      @default(0)
  alt       String?
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Run the migration** (from `apps/api/` so Prisma picks up `.env`)

```bash
cd apps/api
npx prisma migrate dev --name init
cd ../..
```

Expected: `Your database is now in sync with your schema.` and a folder `apps/api/prisma/migrations/<timestamp>_init/` exists.

- [ ] **Step 3: Verify tables exist**

```bash
docker compose exec postgres psql -U fishing -d fishing_db -c '\dt'
```

Expected: table list includes `Water`, `Region`, `FishSpecies`, `Amenity`, `WaterFish`, `WaterAmenity`, `Media`, `_prisma_migrations`.

- [ ] **Step 4: Create `apps/api/src/prisma/prisma.service.ts`**

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 5: Create `apps/api/src/prisma/prisma.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 6: Register in `apps/api/src/app.module.ts`** — add to imports:

```ts
import { PrismaModule } from './prisma/prisma.module';
// ...
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
```

- [ ] **Step 7: Verify the app still boots**

```bash
npm run dev:api
```

In a second terminal: `curl -s http://localhost:3000/api/health` → `{"status":"ok"}`. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(api): add prisma schema, init migration and PrismaService"
```

---

### Task 6: Seed — regions, fish species, amenities, demo waters

**Files:**
- Create: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Create `apps/api/prisma/seed.ts`**

```ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REGIONS: Array<[string, string, string]> = [
  ['vinnytska-oblast', 'Вінницька область', 'Vinnytsia Oblast'],
  ['volynska-oblast', 'Волинська область', 'Volyn Oblast'],
  ['dnipropetrovska-oblast', 'Дніпропетровська область', 'Dnipropetrovsk Oblast'],
  ['donetska-oblast', 'Донецька область', 'Donetsk Oblast'],
  ['zhytomyrska-oblast', 'Житомирська область', 'Zhytomyr Oblast'],
  ['zakarpatska-oblast', 'Закарпатська область', 'Zakarpattia Oblast'],
  ['zaporizka-oblast', 'Запорізька область', 'Zaporizhzhia Oblast'],
  ['ivano-frankivska-oblast', 'Івано-Франківська область', 'Ivano-Frankivsk Oblast'],
  ['kyivska-oblast', 'Київська область', 'Kyiv Oblast'],
  ['kirovohradska-oblast', 'Кіровоградська область', 'Kirovohrad Oblast'],
  ['luhanska-oblast', 'Луганська область', 'Luhansk Oblast'],
  ['lvivska-oblast', 'Львівська область', 'Lviv Oblast'],
  ['mykolaivska-oblast', 'Миколаївська область', 'Mykolaiv Oblast'],
  ['odeska-oblast', 'Одеська область', 'Odesa Oblast'],
  ['poltavska-oblast', 'Полтавська область', 'Poltava Oblast'],
  ['rivnenska-oblast', 'Рівненська область', 'Rivne Oblast'],
  ['sumska-oblast', 'Сумська область', 'Sumy Oblast'],
  ['ternopilska-oblast', 'Тернопільська область', 'Ternopil Oblast'],
  ['kharkivska-oblast', 'Харківська область', 'Kharkiv Oblast'],
  ['khersonska-oblast', 'Херсонська область', 'Kherson Oblast'],
  ['khmelnytska-oblast', 'Хмельницька область', 'Khmelnytskyi Oblast'],
  ['cherkaska-oblast', 'Черкаська область', 'Cherkasy Oblast'],
  ['chernivetska-oblast', 'Чернівецька область', 'Chernivtsi Oblast'],
  ['chernihivska-oblast', 'Чернігівська область', 'Chernihiv Oblast'],
  ['kyiv', 'м. Київ', 'Kyiv (city)'],
];

const FISH: Array<[string, string, string]> = [
  ['shchuka', 'Щука', 'Pike'],
  ['korop', 'Короп', 'Carp'],
  ['karas', 'Карась', 'Crucian carp'],
  ['sudak', 'Судак', 'Zander'],
  ['okun', 'Окунь', 'Perch'],
  ['som', 'Сом', 'Wels catfish'],
  ['lyn', 'Лин', 'Tench'],
  ['lyashch', 'Лящ', 'Bream'],
  ['plitka', 'Плітка', 'Roach'],
  ['krasnopirka', 'Краснопірка', 'Rudd'],
  ['tovstolob', 'Товстолоб', 'Silver carp'],
  ['bilyi-amur', 'Білий амур', 'Grass carp'],
  ['zherekh', 'Жерех', 'Asp'],
  ['holoven', 'Головень', 'Chub'],
  ['forel', 'Форель', 'Trout'],
  ['osetr', 'Осетер', 'Sturgeon'],
  ['sazan', 'Сазан', 'Wild carp'],
  ['yorzh', 'Йорж', 'Ruffe'],
];

const AMENITIES: Array<[string, string, string]> = [
  ['altanky', 'Альтанки', 'Gazebos'],
  ['nochivlia', 'Ночівля', 'Overnight stay'],
  ['chovny', 'Човни', 'Boats'],
  ['parkovka', 'Парковка', 'Parking'],
  ['kafe', 'Кафе', 'Café'],
  ['mahazyn', 'Магазин', 'Shop'],
  ['prokat-snastei', 'Прокат снастей', 'Tackle rental'],
  ['tualet', 'Туалет', 'Toilet'],
  ['dush', 'Душ', 'Shower'],
  ['elektryka', 'Електрика', 'Electricity'],
];

async function seedDictionaries() {
  for (const [slug, name, nameEn] of REGIONS) {
    await prisma.region.upsert({
      where: { slug },
      update: { name, nameEn },
      create: { slug, name, nameEn },
    });
  }
  for (const [slug, name, nameEn] of FISH) {
    await prisma.fishSpecies.upsert({
      where: { slug },
      update: { name, nameEn },
      create: { slug, name, nameEn },
    });
  }
  for (const [slug, name, nameEn] of AMENITIES) {
    await prisma.amenity.upsert({
      where: { slug },
      update: { name, nameEn },
      create: { slug, name, nameEn },
    });
  }
}

async function seedDemoWaters() {
  const lviv = await prisma.region.findUniqueOrThrow({ where: { slug: 'lvivska-oblast' } });
  const fishBySlug = async (slug: string) =>
    prisma.fishSpecies.findUniqueOrThrow({ where: { slug } });
  const amenityBySlug = async (slug: string) =>
    prisma.amenity.findUniqueOrThrow({ where: { slug } });

  const demo = [
    {
      slug: 'ozero-navariia',
      name: 'Озеро Наварія',
      nameEn: 'Navaria Lake',
      description: 'Платне озеро неподалік Львова. Зариблене коропом і карасем, є щука.',
      descriptionEn: 'A paid lake near Lviv stocked with carp and crucian carp; pike present.',
      regionId: lviv.id,
      district: 'Львівський район',
      lat: 49.7665,
      lng: 23.9571,
      waterType: 'LAKE' as const,
      isPaid: true,
      priceFrom: 300,
      priceTo: 700,
      priceNote: 'Вхід 300 грн, доба 700 грн',
      verified: true,
      status: 'PUBLISHED' as const,
      fishSlugs: ['korop', 'karas', 'shchuka'],
      amenitySlugs: ['altanky', 'parkovka'],
    },
    {
      slug: 'stav-murovane',
      name: 'Став Муроване',
      description: 'Тихий став для коропової риболовлі, чудові місця під фідер.',
      regionId: lviv.id,
      district: 'Львівський район',
      lat: 49.9052,
      lng: 24.1175,
      waterType: 'POND' as const,
      isPaid: true,
      priceFrom: 250,
      priceTo: null,
      priceNote: 'Світловий день 250 грн',
      verified: false,
      status: 'PUBLISHED' as const,
      fishSlugs: ['korop', 'lyashch', 'karas'],
      amenitySlugs: ['parkovka'],
    },
    {
      slug: 'richka-dnister-rozvadiv',
      name: 'Річка Дністер (Розвадів)',
      description: 'Безкоштовна ділянка Дністра. Хижак: щука, судак, сом.',
      regionId: lviv.id,
      district: 'Стрийський район',
      lat: 49.5731,
      lng: 23.9402,
      waterType: 'RIVER' as const,
      isPaid: false,
      priceFrom: null,
      priceTo: null,
      priceNote: null,
      verified: false,
      status: 'PUBLISHED' as const,
      fishSlugs: ['shchuka', 'sudak', 'som', 'okun'],
      amenitySlugs: [],
    },
  ];

  for (const { fishSlugs, amenitySlugs, ...data } of demo) {
    const fishIds = await Promise.all(fishSlugs.map((s) => fishBySlug(s).then((f) => f.id)));
    const amenityIds = await Promise.all(
      amenitySlugs.map((s) => amenityBySlug(s).then((a) => a.id)),
    );
    await prisma.water.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        fish: { create: fishIds.map((fishId) => ({ fishId })) },
        amenities: { create: amenityIds.map((amenityId) => ({ amenityId })) },
      },
    });
  }
}

async function main() {
  await seedDictionaries();
  if (process.env.SEED_DEMO === '1') {
    await seedDemoWaters();
  }
  const counts = {
    regions: await prisma.region.count(),
    fish: await prisma.fishSpecies.count(),
    amenities: await prisma.amenity.count(),
    waters: await prisma.water.count(),
  };
  console.log('Seed done:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the seed**

```bash
cd apps/api
npx prisma db seed
cd ../..
```

Expected output: `Seed done: { regions: 25, fish: 18, amenities: 10, waters: 3 }`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(api): add seed for regions, fish, amenities and demo waters"
```

---

### Task 7: Public dictionaries endpoints

**Files:**
- Create: `apps/api/src/common/lang-query.dto.ts`, `apps/api/src/dictionaries/dictionaries.module.ts`, `apps/api/src/dictionaries/dictionaries.controller.ts`, `apps/api/src/dictionaries/dictionaries.service.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create `apps/api/src/common/lang-query.dto.ts`** (shared by all public endpoints)

```ts
import { Locale, LOCALES } from '@fishing/shared';
import { IsIn, IsOptional } from 'class-validator';

export class LangQueryDto {
  @IsOptional()
  @IsIn(LOCALES)
  lang: Locale = 'uk';
}
```

- [ ] **Step 1b: Create `apps/api/src/dictionaries/dictionaries.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { AmenityDto, FishSpeciesDto, Locale, RegionDto } from '@fishing/shared';
import { PrismaService } from '../prisma/prisma.service';

const loc = (lang: Locale, uk: string, en: string) => (lang === 'en' && en ? en : uk);

@Injectable()
export class DictionariesService {
  constructor(private readonly prisma: PrismaService) {}

  async regions(lang: Locale): Promise<RegionDto[]> {
    const rows = await this.prisma.region.findMany({ orderBy: { name: 'asc' } });
    return rows.map((r) => ({ id: r.id, slug: r.slug, name: loc(lang, r.name, r.nameEn) }));
  }

  async fishSpecies(lang: Locale): Promise<FishSpeciesDto[]> {
    const rows = await this.prisma.fishSpecies.findMany({ orderBy: { name: 'asc' } });
    return rows.map((f) => ({ id: f.id, slug: f.slug, name: loc(lang, f.name, f.nameEn) }));
  }

  async amenities(lang: Locale): Promise<AmenityDto[]> {
    const rows = await this.prisma.amenity.findMany({ orderBy: { name: 'asc' } });
    return rows.map((a) => ({
      id: a.id,
      slug: a.slug,
      name: loc(lang, a.name, a.nameEn),
      icon: a.icon,
    }));
  }
}
```

- [ ] **Step 2: Create `apps/api/src/dictionaries/dictionaries.controller.ts`**

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { LangQueryDto } from '../common/lang-query.dto';
import { DictionariesService } from './dictionaries.service';

@Controller()
export class DictionariesController {
  constructor(private readonly dictionaries: DictionariesService) {}

  @Get('regions')
  regions(@Query() q: LangQueryDto) {
    return this.dictionaries.regions(q.lang);
  }

  @Get('fish-species')
  fishSpecies(@Query() q: LangQueryDto) {
    return this.dictionaries.fishSpecies(q.lang);
  }

  @Get('amenities')
  amenities(@Query() q: LangQueryDto) {
    return this.dictionaries.amenities(q.lang);
  }
}
```

- [ ] **Step 3: Create `apps/api/src/dictionaries/dictionaries.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { DictionariesController } from './dictionaries.controller';
import { DictionariesService } from './dictionaries.service';

@Module({
  controllers: [DictionariesController],
  providers: [DictionariesService],
  exports: [DictionariesService],
})
export class DictionariesModule {}
```

- [ ] **Step 4: Register in `app.module.ts` imports:** add `DictionariesModule` (import from `./dictionaries/dictionaries.module`).

- [ ] **Step 5: Verify**

```bash
npm run dev:api
```

Second terminal:

```bash
curl -s http://localhost:3000/api/regions | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).length))"
curl -s http://localhost:3000/api/fish-species | head -c 200
curl -s 'http://localhost:3000/api/regions?lang=en' | grep -o 'Lviv Oblast'
```

Expected: `25`; JSON starting with `[{"id":...,"slug":"bilyi-amur","name":"Білий амур"...`; `Lviv Oblast`. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(api): public dictionaries endpoints"
```

---

### Task 8: Public waters endpoints (list, map pins, detail)

**Files:**
- Create: `apps/api/src/waters/dto/waters-query.dto.ts`, `apps/api/src/waters/waters.mapper.ts`, `apps/api/src/waters/waters.service.ts`, `apps/api/src/waters/waters.controller.ts`, `apps/api/src/waters/waters.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create `apps/api/src/waters/dto/waters-query.dto.ts`**

```ts
import { WATER_TYPES, WaterType } from '@fishing/shared';
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { LangQueryDto } from '../../common/lang-query.dto';

export class WatersQueryDto extends LangQueryDto {
  @IsOptional()
  @IsString()
  region?: string;

  /** comma-separated fish slugs, matches waters having ANY of them */
  @IsOptional()
  @IsString()
  fish?: string;

  /** comma-separated amenity slugs, matches waters having ALL of them */
  @IsOptional()
  @IsString()
  amenities?: string;

  @IsOptional()
  @IsIn(WATER_TYPES)
  type?: WaterType;

  @IsOptional()
  @IsBooleanString()
  paid?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  perPage: number = 20;
}
```

- [ ] **Step 2: Create `apps/api/src/waters/waters.mapper.ts`**

```ts
import {
  Locale,
  MapPinDto,
  MediaDto,
  WaterDetailDto,
  WaterListItemDto,
  WaterStatus,
  WaterType,
} from '@fishing/shared';
import {
  Amenity,
  FishSpecies,
  Media,
  Region,
  Water,
  WaterAmenity,
  WaterFish,
} from '@prisma/client';

export type WaterFull = Water & {
  region: Region;
  fish: (WaterFish & { fish: FishSpecies })[];
  amenities: (WaterAmenity & { amenity: Amenity })[];
  media: Media[];
};

export const FULL_INCLUDE = {
  region: true,
  fish: { include: { fish: true } },
  amenities: { include: { amenity: true } },
  media: { orderBy: { sortOrder: 'asc' as const } },
};

const variant = (fullUrl: string, v: 'thumb' | 'card') =>
  fullUrl.replace('-full.webp', `-${v}.webp`);

const loc = (lang: Locale, uk: string, en: string | null) => (lang === 'en' && en ? en : uk);
const locN = (lang: Locale, uk: string | null, en: string | null) =>
  lang === 'en' && en ? en : uk;

export function toMediaDto(m: Media): MediaDto {
  return {
    id: m.id,
    urlFull: m.url,
    urlCard: variant(m.url, 'card'),
    urlThumb: variant(m.url, 'thumb'),
    alt: m.alt,
    sortOrder: m.sortOrder,
  };
}

export function toListItem(w: WaterFull, lang: Locale): WaterListItemDto {
  const cover = w.media[0] ?? null;
  return {
    id: w.id,
    slug: w.slug,
    name: loc(lang, w.name, w.nameEn),
    regionSlug: w.region.slug,
    regionName: loc(lang, w.region.name, w.region.nameEn),
    district: w.district,
    lat: w.lat,
    lng: w.lng,
    waterType: w.waterType as WaterType,
    isPaid: w.isPaid,
    priceFrom: w.priceFrom,
    priceTo: w.priceTo,
    verified: w.verified,
    fishNames: w.fish.map((f) => loc(lang, f.fish.name, f.fish.nameEn)),
    coverThumbUrl: cover ? variant(cover.url, 'thumb') : null,
    coverCardUrl: cover ? variant(cover.url, 'card') : null,
  };
}

export function toDetail(w: WaterFull, lang: Locale): WaterDetailDto {
  return {
    ...toListItem(w, lang),
    description: loc(lang, w.description, w.descriptionEn),
    areaHa: w.areaHa,
    priceNote: locN(lang, w.priceNote, w.priceNoteEn),
    phone: w.phone,
    website: w.website,
    rules: locN(lang, w.rules, w.rulesEn),
    status: w.status as WaterStatus,
    seoTitle: locN(lang, w.seoTitle, w.seoTitleEn),
    seoDescription: locN(lang, w.seoDescription, w.seoDescriptionEn),
    nameEn: w.nameEn,
    descriptionEn: w.descriptionEn,
    rulesEn: w.rulesEn,
    priceNoteEn: w.priceNoteEn,
    seoTitleEn: w.seoTitleEn,
    seoDescriptionEn: w.seoDescriptionEn,
    fish: w.fish.map((f) => ({
      id: f.fish.id,
      slug: f.fish.slug,
      name: loc(lang, f.fish.name, f.fish.nameEn),
    })),
    amenities: w.amenities.map((a) => ({
      id: a.amenity.id,
      slug: a.amenity.slug,
      name: loc(lang, a.amenity.name, a.amenity.nameEn),
      icon: a.amenity.icon,
    })),
    media: w.media.map(toMediaDto),
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export function toPin(
  w: Pick<Water, 'id' | 'slug' | 'name' | 'nameEn' | 'lat' | 'lng' | 'isPaid'>,
  lang: Locale,
): MapPinDto {
  return {
    id: w.id,
    slug: w.slug,
    name: loc(lang, w.name, w.nameEn),
    lat: w.lat,
    lng: w.lng,
    isPaid: w.isPaid,
  };
}
```

- [ ] **Step 3: Create `apps/api/src/waters/waters.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Locale, MapPinDto, Paginated, WaterDetailDto, WaterListItemDto } from '@fishing/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WatersQueryDto } from './dto/waters-query.dto';
import { FULL_INCLUDE, toDetail, toListItem, toPin } from './waters.mapper';

@Injectable()
export class WatersService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(q: WatersQueryDto): Prisma.WaterWhereInput {
    const and: Prisma.WaterWhereInput[] = [{ status: 'PUBLISHED' }];

    if (q.region) and.push({ region: { slug: q.region } });
    if (q.type) and.push({ waterType: q.type });
    if (q.paid !== undefined) and.push({ isPaid: q.paid === 'true' });
    if (q.search) and.push({ name: { contains: q.search, mode: 'insensitive' } });

    if (q.fish) {
      const slugs = q.fish.split(',').filter(Boolean);
      if (slugs.length) and.push({ fish: { some: { fish: { slug: { in: slugs } } } } });
    }
    if (q.amenities) {
      for (const slug of q.amenities.split(',').filter(Boolean)) {
        and.push({ amenities: { some: { amenity: { slug } } } });
      }
    }
    return { AND: and };
  }

  async list(q: WatersQueryDto): Promise<Paginated<WaterListItemDto>> {
    const where = this.buildWhere(q);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.water.count({ where }),
      this.prisma.water.findMany({
        where,
        include: FULL_INCLUDE,
        orderBy: [{ verified: 'desc' }, { createdAt: 'desc' }],
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
    ]);
    return {
      items: rows.map((w) => toListItem(w, q.lang)),
      total,
      page: q.page,
      perPage: q.perPage,
    };
  }

  async mapPins(q: WatersQueryDto): Promise<MapPinDto[]> {
    const rows = await this.prisma.water.findMany({
      where: this.buildWhere(q),
      select: {
        id: true,
        slug: true,
        name: true,
        nameEn: true,
        lat: true,
        lng: true,
        isPaid: true,
      },
      take: 2000,
    });
    return rows.map((w) => toPin(w, q.lang));
  }

  async bySlug(slug: string, lang: Locale): Promise<WaterDetailDto> {
    const water = await this.prisma.water.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: FULL_INCLUDE,
    });
    if (!water) throw new NotFoundException(`Water "${slug}" not found`);
    return toDetail(water, lang);
  }
}
```

- [ ] **Step 4: Create `apps/api/src/waters/waters.controller.ts`** (note: `map` route MUST be declared before `:slug`)

```ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { LangQueryDto } from '../common/lang-query.dto';
import { WatersQueryDto } from './dto/waters-query.dto';
import { WatersService } from './waters.service';

@Controller('waters')
export class WatersController {
  constructor(private readonly waters: WatersService) {}

  @Get()
  list(@Query() query: WatersQueryDto) {
    return this.waters.list(query);
  }

  @Get('map')
  mapPins(@Query() query: WatersQueryDto) {
    return this.waters.mapPins(query);
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string, @Query() q: LangQueryDto) {
    return this.waters.bySlug(slug, q.lang);
  }
}
```

- [ ] **Step 5: Create `apps/api/src/waters/waters.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { WatersController } from './waters.controller';
import { WatersService } from './waters.service';

@Module({
  controllers: [WatersController],
  providers: [WatersService],
})
export class WatersModule {}
```

- [ ] **Step 6: Register `WatersModule` in `app.module.ts` imports.**

- [ ] **Step 7: Verify**

```bash
npm run dev:api
```

Second terminal:

```bash
curl -s 'http://localhost:3000/api/waters?region=lvivska-oblast&fish=korop' | head -c 400
curl -s 'http://localhost:3000/api/waters/map' | head -c 300
curl -s 'http://localhost:3000/api/waters/ozero-navariia' | head -c 400
curl -s 'http://localhost:3000/api/waters/ozero-navariia?lang=en' | grep -o 'Navaria Lake' | head -1
curl -s 'http://localhost:3000/api/waters/stav-murovane?lang=en' | grep -o 'Став Муроване' | head -1
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/api/waters/does-not-exist'
```

Expected: list JSON with `"total":2` (Наварія + Муроване match korop); map JSON array of 3 pins; detail JSON with `"slug":"ozero-navariia"` and `fish`/`amenities` arrays; `Navaria Lake` (EN content served); `Став Муроване` (no EN translation in seed → falls back to Ukrainian); `404`. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(api): public waters endpoints with filters, map pins and detail"
```

---

### Task 9: Admin auth (login/logout, JWT cookie, guard)

**Files:**
- Create: `apps/api/src/admin-auth/admin-auth.module.ts`, `apps/api/src/admin-auth/admin-auth.controller.ts`, `apps/api/src/admin-auth/admin-auth.service.ts`, `apps/api/src/admin-auth/admin.guard.ts`, `apps/api/src/admin-auth/dto/login.dto.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create `apps/api/src/admin-auth/dto/login.dto.ts`**

```ts
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  login: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

- [ ] **Step 2: Create `apps/api/src/admin-auth/admin-auth.service.ts`**

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcryptjs';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  login(login: string, password: string): string {
    const expectedLogin = this.config.get<string>('ADMIN_LOGIN');
    const hash = this.config.get<string>('ADMIN_PASSWORD_HASH');
    if (!expectedLogin || !hash || login !== expectedLogin || !compareSync(password, hash)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.jwt.sign({ sub: 'admin' });
  }
}
```

- [ ] **Step 3: Create `apps/api/src/admin-auth/admin.guard.ts`**

```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export const ADMIN_COOKIE = 'admin_token';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = (req.cookies as Record<string, string> | undefined)?.[ADMIN_COOKIE];
    if (!token) throw new UnauthorizedException('Not authenticated');
    try {
      this.jwt.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
```

- [ ] **Step 4: Create `apps/api/src/admin-auth/admin-auth.controller.ts`**

```ts
import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ADMIN_COOKIE } from './admin.guard';
import { AdminAuthService } from './admin-auth.service';
import { LoginDto } from './dto/login.dto';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const token = this.auth.login(dto.login, dto.password);
    res.cookie(ADMIN_COOKIE, token, { ...COOKIE_OPTS, maxAge: 7 * 24 * 3600 * 1000 });
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ADMIN_COOKIE, COOKIE_OPTS);
    return { ok: true };
  }
}
```

- [ ] **Step 5: Create `apps/api/src/admin-auth/admin-auth.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminGuard } from './admin.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminGuard],
  exports: [AdminGuard],
})
export class AdminAuthModule {}
```

- [ ] **Step 6: Register `AdminAuthModule` in `app.module.ts` imports.**

- [ ] **Step 7: Verify**

```bash
npm run dev:api
```

Second terminal:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/admin/login \
  -H 'Content-Type: application/json' -d '{"login":"admin","password":"wrong-pass"}'
curl -si -X POST http://localhost:3000/api/admin/login \
  -H 'Content-Type: application/json' -d '{"login":"admin","password":"admin12345"}' | grep -i 'set-cookie\|200'
```

Expected: `401`, then a `Set-Cookie: admin_token=...` header and `{"ok":true}` body (HTTP 200). Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(api): admin auth with env credentials and JWT cookie"
```

---

### Task 10: Admin waters CRUD + admin dictionaries

**Files:**
- Create: `apps/api/src/common/slugify.ts`, `apps/api/src/waters/dto/create-water.dto.ts`, `apps/api/src/waters/dto/update-water.dto.ts`, `apps/api/src/waters/dto/admin-waters-query.dto.ts`, `apps/api/src/waters/admin-waters.service.ts`, `apps/api/src/waters/admin-waters.controller.ts`, `apps/api/src/dictionaries/admin-dictionaries.controller.ts`, `apps/api/src/dictionaries/dto/create-dictionary-item.dto.ts`
- Modify: `apps/api/src/waters/waters.module.ts`, `apps/api/src/dictionaries/dictionaries.module.ts`

- [ ] **Step 1: Create `apps/api/src/common/slugify.ts`** (Ukrainian official romanization, KMU-2010)

```ts
const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh',
  з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', "'": '', '’': '',
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map((ch) => MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

- [ ] **Step 2: Create `apps/api/src/waters/dto/create-water.dto.ts`**

```ts
import { WATER_TYPES, WaterType } from '@fishing/shared';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateWaterDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  description: string;

  @IsInt()
  regionId: number;

  @IsOptional()
  @IsString()
  district?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaHa?: number;

  @IsIn(WATER_TYPES)
  waterType: WaterType;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceFrom?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceTo?: number;

  @IsOptional()
  @IsString()
  priceNote?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  rulesEn?: string;

  @IsOptional()
  @IsString()
  priceNoteEn?: string;

  @IsOptional()
  @IsString()
  seoTitleEn?: string;

  @IsOptional()
  @IsString()
  seoDescriptionEn?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  fishIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  amenityIds?: number[];
}
```

- [ ] **Step 3: Create `apps/api/src/waters/dto/update-water.dto.ts`**

```ts
import { PartialType } from '@nestjs/mapped-types';
import { WATER_STATUSES, WaterStatus } from '@fishing/shared';
import { IsIn, IsOptional } from 'class-validator';
import { CreateWaterDto } from './create-water.dto';

export class UpdateWaterDto extends PartialType(CreateWaterDto) {
  @IsOptional()
  @IsIn(WATER_STATUSES)
  status?: WaterStatus;
}
```

Note: `@nestjs/mapped-types` is a transitive dependency of `@nestjs/config`; add it explicitly:

```bash
npm install @nestjs/mapped-types -w apps/api
```

- [ ] **Step 4: Create `apps/api/src/waters/dto/admin-waters-query.dto.ts`**

```ts
import { WATER_STATUSES, WaterStatus } from '@fishing/shared';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminWatersQueryDto {
  @IsOptional()
  @IsIn(WATER_STATUSES)
  status?: WaterStatus;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  perPage: number = 20;
}
```

- [ ] **Step 5: Create `apps/api/src/waters/admin-waters.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Paginated, WaterDetailDto } from '@fishing/shared';
import { Prisma } from '@prisma/client';
import { slugify } from '../common/slugify';
import { PrismaService } from '../prisma/prisma.service';
import { AdminWatersQueryDto } from './dto/admin-waters-query.dto';
import { CreateWaterDto } from './dto/create-water.dto';
import { UpdateWaterDto } from './dto/update-water.dto';
import { FULL_INCLUDE, toDetail } from './waters.mapper';

@Injectable()
export class AdminWatersService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'vodoyma';
    let slug = base;
    for (let i = 2; await this.prisma.water.findUnique({ where: { slug } }); i++) {
      slug = `${base}-${i}`;
    }
    return slug;
  }

  async list(q: AdminWatersQueryDto): Promise<Paginated<WaterDetailDto>> {
    const and: Prisma.WaterWhereInput[] = [];
    if (q.status) and.push({ status: q.status });
    if (q.region) and.push({ region: { slug: q.region } });
    if (q.search) and.push({ name: { contains: q.search, mode: 'insensitive' } });
    const where: Prisma.WaterWhereInput = { AND: and };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.water.count({ where }),
      this.prisma.water.findMany({
        where,
        include: FULL_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
    ]);
    return {
      items: rows.map((w) => toDetail(w, 'uk')),
      total,
      page: q.page,
      perPage: q.perPage,
    };
  }

  async byId(id: string): Promise<WaterDetailDto> {
    const water = await this.prisma.water.findUnique({ where: { id }, include: FULL_INCLUDE });
    if (!water) throw new NotFoundException(`Water ${id} not found`);
    return toDetail(water, 'uk');
  }

  async create(dto: CreateWaterDto): Promise<WaterDetailDto> {
    const { fishIds = [], amenityIds = [], ...data } = dto;
    const water = await this.prisma.water.create({
      data: {
        ...data,
        slug: await this.uniqueSlug(dto.name),
        fish: { create: fishIds.map((fishId) => ({ fishId })) },
        amenities: { create: amenityIds.map((amenityId) => ({ amenityId })) },
      },
      include: FULL_INCLUDE,
    });
    return toDetail(water, 'uk');
  }

  async update(id: string, dto: UpdateWaterDto): Promise<WaterDetailDto> {
    await this.byId(id);
    const { fishIds, amenityIds, ...data } = dto;
    const water = await this.prisma.$transaction(async (tx) => {
      if (fishIds) {
        await tx.waterFish.deleteMany({ where: { waterId: id } });
        await tx.waterFish.createMany({ data: fishIds.map((fishId) => ({ waterId: id, fishId })) });
      }
      if (amenityIds) {
        await tx.waterAmenity.deleteMany({ where: { waterId: id } });
        await tx.waterAmenity.createMany({
          data: amenityIds.map((amenityId) => ({ waterId: id, amenityId })),
        });
      }
      return tx.water.update({ where: { id }, data, include: FULL_INCLUDE });
    });
    return toDetail(water, 'uk');
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.byId(id);
    await this.prisma.water.delete({ where: { id } });
    return { ok: true };
  }
}
```

- [ ] **Step 6: Create `apps/api/src/waters/admin-waters.controller.ts`**

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin-auth/admin.guard';
import { AdminWatersService } from './admin-waters.service';
import { AdminWatersQueryDto } from './dto/admin-waters-query.dto';
import { CreateWaterDto } from './dto/create-water.dto';
import { UpdateWaterDto } from './dto/update-water.dto';

@Controller('admin/waters')
@UseGuards(AdminGuard)
export class AdminWatersController {
  constructor(private readonly waters: AdminWatersService) {}

  @Get()
  list(@Query() query: AdminWatersQueryDto) {
    return this.waters.list(query);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.waters.byId(id);
  }

  @Post()
  create(@Body() dto: CreateWaterDto) {
    return this.waters.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWaterDto) {
    return this.waters.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.waters.remove(id);
  }
}
```

- [ ] **Step 7: Update `apps/api/src/waters/waters.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminWatersController } from './admin-waters.controller';
import { AdminWatersService } from './admin-waters.service';
import { WatersController } from './waters.controller';
import { WatersService } from './waters.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [WatersController, AdminWatersController],
  providers: [WatersService, AdminWatersService],
})
export class WatersModule {}
```

- [ ] **Step 8: Create `apps/api/src/dictionaries/dto/create-dictionary-item.dto.ts`**

```ts
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDictionaryItemDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
```

- [ ] **Step 9: Create `apps/api/src/dictionaries/admin-dictionaries.controller.ts`**

```ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin-auth/admin.guard';
import { slugify } from '../common/slugify';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDictionaryItemDto } from './dto/create-dictionary-item.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminDictionariesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('fish-species')
  createFish(@Body() dto: CreateDictionaryItemDto) {
    return this.prisma.fishSpecies.create({
      data: { name: dto.name, nameEn: dto.nameEn ?? dto.name, slug: slugify(dto.name) },
    });
  }

  @Post('amenities')
  createAmenity(@Body() dto: CreateDictionaryItemDto) {
    return this.prisma.amenity.create({
      data: {
        name: dto.name,
        nameEn: dto.nameEn ?? dto.name,
        slug: slugify(dto.name),
        icon: dto.icon ?? null,
      },
    });
  }
}
```

- [ ] **Step 10: Update `apps/api/src/dictionaries/dictionaries.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminDictionariesController } from './admin-dictionaries.controller';
import { DictionariesController } from './dictionaries.controller';
import { DictionariesService } from './dictionaries.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [DictionariesController, AdminDictionariesController],
  providers: [DictionariesService],
  exports: [DictionariesService],
})
export class DictionariesModule {}
```

- [ ] **Step 11: Verify the full admin flow**

```bash
npm run dev:api
```

Second terminal:

```bash
curl -s -c /tmp/admin.jar -X POST http://localhost:3000/api/admin/login \
  -H 'Content-Type: application/json' -d '{"login":"admin","password":"admin12345"}'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/admin/waters
curl -s -b /tmp/admin.jar 'http://localhost:3000/api/admin/waters' | head -c 200
curl -s -b /tmp/admin.jar -X POST http://localhost:3000/api/admin/waters \
  -H 'Content-Type: application/json' \
  -d '{"name":"Тестовий став Янів","description":"Тест","regionId":12,"lat":49.95,"lng":23.65,"waterType":"POND","isPaid":true,"priceFrom":200,"fishIds":[1,2]}'
```

Expected: `{"ok":true}`; then `401` (no cookie); then a paginated JSON; then a created water JSON containing `"slug":"testovyi-stav-ianiv"` and `"status":"DRAFT"`.

Copy the `"id"` from the create response, then publish and check it appears publicly:

```bash
curl -s -b /tmp/admin.jar -X PATCH http://localhost:3000/api/admin/waters/<ID> \
  -H 'Content-Type: application/json' -d '{"status":"PUBLISHED"}' | head -c 200
curl -s 'http://localhost:3000/api/waters/testovyi-stav-ianiv' | head -c 200
curl -s -b /tmp/admin.jar -X DELETE http://localhost:3000/api/admin/waters/<ID>
```

Expected: PATCH returns `"status":"PUBLISHED"`; public GET returns the water; DELETE returns `{"ok":true}`. Stop the server.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat(api): admin waters CRUD and admin dictionaries endpoints"
```

---

### Task 11: Media upload with sharp + static serving

**Files:**
- Create: `apps/api/src/media/storage.service.ts`, `apps/api/src/media/media.service.ts`, `apps/api/src/media/media.controller.ts`, `apps/api/src/media/media.module.ts`, `apps/api/src/media/dto/reorder-media.dto.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create `apps/api/src/media/storage.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

export const UPLOADS_ROOT = join(process.cwd(), 'uploads');

/** Local-disk storage. Swap this class for an S3/R2 implementation later. */
@Injectable()
export class StorageService {
  async save(relPath: string, data: Buffer): Promise<void> {
    const abs = join(UPLOADS_ROOT, relPath);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, data);
  }

  async delete(relPath: string): Promise<void> {
    await rm(join(UPLOADS_ROOT, relPath), { force: true });
  }
}
```

- [ ] **Step 2: Create `apps/api/src/media/dto/reorder-media.dto.ts`**

```ts
import { IsArray, IsString } from 'class-validator';

export class ReorderMediaDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
```

- [ ] **Step 3: Create `apps/api/src/media/media.service.ts`**

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaDto } from '@fishing/shared';
import sharp from 'sharp';
import { toMediaDto } from '../waters/waters.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

const SIZES = [
  { suffix: 'thumb', width: 320 },
  { suffix: 'card', width: 640 },
  { suffix: 'full', width: 1600 },
] as const;

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(waterId: string, file: Express.Multer.File): Promise<MediaDto> {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
    const water = await this.prisma.water.findUnique({ where: { id: waterId } });
    if (!water) throw new NotFoundException(`Water ${waterId} not found`);

    const last = await this.prisma.media.findFirst({
      where: { waterId },
      orderBy: { sortOrder: 'desc' },
    });

    const media = await this.prisma.media.create({
      data: { waterId, url: '', sortOrder: (last?.sortOrder ?? -1) + 1 },
    });

    for (const { suffix, width } of SIZES) {
      const buf = await sharp(file.buffer)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      await this.storage.save(this.relPath(waterId, media.id, suffix), buf);
    }

    const url = `/uploads/${this.relPath(waterId, media.id, 'full')}`;
    const updated = await this.prisma.media.update({ where: { id: media.id }, data: { url } });
    return toMediaDto(updated);
  }

  async reorder(dto: { ids: string[] }): Promise<{ ok: true }> {
    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.media.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    return { ok: true };
  }

  async remove(id: string): Promise<{ ok: true }> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException(`Media ${id} not found`);
    for (const { suffix } of SIZES) {
      await this.storage.delete(this.relPath(media.waterId, media.id, suffix));
    }
    await this.prisma.media.delete({ where: { id } });
    return { ok: true };
  }

  private relPath(waterId: string, mediaId: string, suffix: string): string {
    return `waters/${waterId}/${mediaId}-${suffix}.webp`;
  }
}
```

- [ ] **Step 4: Create `apps/api/src/media/media.controller.ts`**

```ts
import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminGuard } from '../admin-auth/admin.guard';
import { ReorderMediaDto } from './dto/reorder-media.dto';
import { MediaService } from './media.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('waters/:id/media')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  upload(@Param('id') waterId: string, @UploadedFile() file: Express.Multer.File) {
    return this.media.upload(waterId, file);
  }

  @Patch('media/reorder')
  reorder(@Body() dto: ReorderMediaDto) {
    return this.media.reorder(dto);
  }

  @Delete('media/:id')
  remove(@Param('id') id: string) {
    return this.media.remove(id);
  }
}
```

- [ ] **Step 5: Create `apps/api/src/media/media.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { StorageService } from './storage.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [MediaController],
  providers: [MediaService, StorageService],
})
export class MediaModule {}
```

- [ ] **Step 6: Register static serving and `MediaModule` in `apps/api/src/app.module.ts`** — final state of the file after this task:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { DictionariesModule } from './dictionaries/dictionaries.module';
import { HealthController } from './health.controller';
import { MediaModule } from './media/media.module';
import { UPLOADS_ROOT } from './media/storage.service';
import { PrismaModule } from './prisma/prisma.module';
import { WatersModule } from './waters/waters.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({ rootPath: UPLOADS_ROOT, serveRoot: '/uploads' }),
    PrismaModule,
    AdminAuthModule,
    DictionariesModule,
    WatersModule,
    MediaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 7: Verify upload end-to-end**

Create a test image: write `/tmp/make-img.js` with the content below, then run `node /tmp/make-img.js` from the repo root (sharp is hoisted into the root `node_modules`):

```js
// /tmp/make-img.js
const sharp = require(require('path').join(process.cwd(), 'node_modules', 'sharp'));
sharp({ create: { width: 2000, height: 1200, channels: 3, background: { r: 30, g: 90, b: 160 } } })
  .png()
  .toFile('/tmp/test-water.png')
  .then(() => console.log('ok'));
```

Expected output: `ok`. Then:

```bash
npm run dev:api
```

Second terminal (re-login if `/tmp/admin.jar` is stale; get a water id from the admin list):

```bash
curl -s -c /tmp/admin.jar -X POST http://localhost:3000/api/admin/login \
  -H 'Content-Type: application/json' -d '{"login":"admin","password":"admin12345"}'
WATER_ID=$(curl -s -b /tmp/admin.jar 'http://localhost:3000/api/admin/waters?search=Наварія' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).items[0].id))")
curl -s -b /tmp/admin.jar -F "file=@/tmp/test-water.png" "http://localhost:3000/api/admin/waters/$WATER_ID/media"
ls apps/api/uploads/waters/$WATER_ID/
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3000$(curl -s http://localhost:3000/api/waters/ozero-navariia | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).media[0].urlFull))")"
```

Expected: upload returns a `MediaDto` JSON with `urlThumb`/`urlCard`/`urlFull`; `ls` shows three files `<mediaId>-thumb.webp`, `<mediaId>-card.webp`, `<mediaId>-full.webp`; final curl prints `200`. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(api): media upload with sharp variants and static serving"
```

---

### Task 12: sitemap.xml

**Files:**
- Create: `apps/api/src/seo/seo.module.ts`, `apps/api/src/seo/seo.controller.ts`, `apps/api/src/seo/seo.service.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create `apps/api/src/seo/seo.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/** A logical page in both locales; en pages live under /en with English segments. */
interface PagePair {
  uk: string;
  en: string;
  lastmod?: string;
}

@Injectable()
export class SeoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async sitemap(): Promise<string> {
    const base = (this.config.get<string>('SITE_BASE_URL') ?? 'http://localhost:4200').replace(
      /\/$/,
      '',
    );

    const [regions, waters, fish] = await Promise.all([
      this.prisma.region.findMany({ select: { slug: true } }),
      this.prisma.water.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true, region: { select: { slug: true } } },
      }),
      this.prisma.fishSpecies.findMany({
        where: { waters: { some: { water: { status: 'PUBLISHED' } } } },
        select: { slug: true },
      }),
    ]);

    const pages: PagePair[] = [
      { uk: '/', en: '/en' },
      { uk: '/vodoymy', en: '/en/waters' },
      { uk: '/karta', en: '/en/map' },
      ...regions.map((r) => ({ uk: `/vodoymy/${r.slug}`, en: `/en/waters/${r.slug}` })),
      ...waters.map((w) => ({
        uk: `/vodoymy/${w.region.slug}/${w.slug}`,
        en: `/en/waters/${w.region.slug}/${w.slug}`,
        lastmod: w.updatedAt.toISOString().slice(0, 10),
      })),
      ...fish.map((f) => ({ uk: `/ryba/${f.slug}`, en: `/en/fish/${f.slug}` })),
    ];

    const alternates = (p: PagePair) =>
      `<xhtml:link rel="alternate" hreflang="uk" href="${base}${p.uk}"/>` +
      `<xhtml:link rel="alternate" hreflang="en" href="${base}${p.en}"/>` +
      `<xhtml:link rel="alternate" hreflang="x-default" href="${base}${p.uk}"/>`;

    const body = pages
      .flatMap((p) =>
        (['uk', 'en'] as const).map((l) => {
          const lastmod = p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : '';
          return `  <url><loc>${base}${p[l]}</loc>${lastmod}${alternates(p)}</url>`;
        }),
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
  }
}
```

- [ ] **Step 2: Create `apps/api/src/seo/seo.controller.ts`**

```ts
import { Controller, Get, Header } from '@nestjs/common';
import { SeoService } from './seo.service';

@Controller()
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  sitemap() {
    return this.seo.sitemap();
  }
}
```

- [ ] **Step 3: Create `apps/api/src/seo/seo.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  controllers: [SeoController],
  providers: [SeoService],
})
export class SeoModule {}
```

- [ ] **Step 4: Register `SeoModule` in `app.module.ts` imports** (after `MediaModule`).

- [ ] **Step 5: Verify** (note: `/sitemap.xml` is excluded from the `api` prefix in `main.ts`)

```bash
npm run dev:api
```

Second terminal:

```bash
curl -s http://localhost:3000/sitemap.xml | head -5
curl -s http://localhost:3000/sitemap.xml | grep -c '<url>'
curl -s http://localhost:3000/sitemap.xml | grep -c 'hreflang="en"'
```

Expected: XML header + `<urlset ...>` with the `xmlns:xhtml` namespace; url count ≥ 62 (each logical page appears as uk and en URL: 3 static + 25 regions + 3 demo waters + fish with waters, ×2); hreflang="en" count equal to the url count. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(api): sitemap.xml generation"
```

---

### Task 13: README, full build check

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md`** with:

```markdown
# Fishing in Ukraine

Каталог водойм України для рибалок. Монорепа: Angular SSR (web) + NestJS (api) + PostgreSQL.

## Структура

- `apps/web` — Angular 20 + SSR (публічний сайт і адмінка)
- `apps/api` — NestJS + Prisma (REST API, медіа, sitemap)
- `packages/shared` — спільні TypeScript-типи
- `docs/superpowers/specs` — дизайн-документи, `docs/superpowers/plans` — плани реалізації

## Локальний запуск

Вимоги: Node ≥ 20, Docker.

​```bash
npm install
cp apps/api/.env.example apps/api/.env   # заповнити JWT_SECRET і ADMIN_PASSWORD_HASH
npm run db:up                            # PostgreSQL у Docker
npm run build:shared
cd apps/api && npx prisma migrate dev && npx prisma db seed && cd ../..
npm run dev:api                          # API на :3000
npm run dev:web                          # Angular на :4200
​```

Хеш пароля адміна: `node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'пароль'`
(виконувати в `apps/api`).

## Корисні команди

- `npm run build` — збірка всіх пакетів
- `cd apps/api && npx prisma studio` — переглянути БД
```

(Remove the markdown escaping backslash-zero-width characters `​` around the inner code fence when writing the file — the inner block must be a normal fenced code block.)

- [ ] **Step 2: Full build verification**

```bash
npm run build
```

Expected: shared, api, and web all build without errors (`packages/shared/dist`, `apps/api/dist/main.js`, `apps/web/dist/fishing-in-ukraine/` all exist).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: update README for monorepo setup"
```

---

## Done criteria for this plan

- `npm run build` succeeds from a clean checkout (after `npm install`).
- With Postgres up, migrated and seeded: all curl checks from Tasks 7–12 pass.
- `?lang=en` returns English content with Ukrainian fallback for untranslated records.
- `git log` shows one commit per task.
- Zero `*.spec.ts` files added.

## What comes next (separate plans)

- **Plan 2:** public Angular frontend — catalog, water pages, Leaflet map, SEO service, hydration, uk/en runtime i18n (Transloco) with `/en` routes and hreflang (spec §5).
- **Plan 3:** admin UI — login, waters table, form with map picker, media management (spec §6).
- **Plan 4:** production deploy — Dockerfiles, compose with Caddy, GitHub Actions (spec §7).
