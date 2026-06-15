# V2.8 — Plan 12: Catch reports (Звіти про вилов)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. NO `*.spec.ts` (project rule — verify via build + curl + headless Chrome). Steps are bite-sized; capture the verification output.

**Goal:** Anglers post catch reports (fish + caught-date + optional photo + optional comment) on a catalog water; reports are pre-moderated and, once approved, appear in a «Останні звіти про вилов» section on the water's public page. Admin gets a moderation dashboard.

**Architecture:** New `CatchReport` Prisma model mirroring `Spot` (photo via sharp→webp, honeypot, throttle) and `Review` (nested `waters/:slug/...` route, pre-moderation, paginated approved list). New `catch-reports` Nest module (public + admin controllers, one service, one mapper). Web: extend the existing water-detail page (no new route) with a reports section + submission form; clone the admin reviews-list page for moderation.

**Tech Stack:** NestJS 11 + Prisma 6, Angular 20 SSR, @fishing/shared, sharp, PrimeNG (admin). Dev servers: api :3000, web :4201, Postgres :5433.

**Spec:** docs/superpowers/specs/2026-06-15-catch-reports-design.md. Patterns to mirror (read these): `apps/api/src/spots/*` (photo upload, honeypot, admin moderation, mapper), `apps/api/src/reviews/*` (nested slug route, listApproved pagination, optional-status admin query DTO), `apps/api/src/waters/waters.controller.ts` (route order), `apps/web/.../water-detail/*` (review form + signals), `apps/web/.../features/admin/reviews/*` + `admin/core/admin-api.service.ts` + `admin/shell/admin-shell.html` + `admin/admin.routes.ts`.

---

## Task 1: API — data model + shared DTO + public endpoints

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (add enum + model + back-relations)
- Modify: `packages/shared/src/index.ts` (add `CatchReportDto`, `CatchReportStatus`, `CATCH_REPORT_STATUSES`)
- Create: `apps/api/src/catch-reports/dto/create-catch-report.dto.ts`
- Create: `apps/api/src/catch-reports/dto/catch-reports-query.dto.ts`
- Create: `apps/api/src/catch-reports/catch-reports.mapper.ts`
- Create: `apps/api/src/catch-reports/catch-reports.service.ts`
- Create: `apps/api/src/catch-reports/catch-reports.controller.ts`
- Create: `apps/api/src/catch-reports/catch-reports.module.ts`
- Modify: `apps/api/src/app.module.ts` (register `CatchReportsModule`)

- [ ] **Step 1: Prisma schema** — add to `schema.prisma`:

```prisma
enum CatchReportStatus {
  PENDING
  APPROVED
  REJECTED
}

model CatchReport {
  id          String            @id @default(uuid())
  water       Water             @relation(fields: [waterId], references: [id], onDelete: Cascade)
  waterId     String
  fish        FishSpecies       @relation(fields: [fishId], references: [id])
  fishId      Int
  caughtAt    DateTime          @db.Date
  comment     String?
  photoUrl    String?
  authorName  String
  authorEmail String?
  status      CatchReportStatus @default(PENDING)
  createdAt   DateTime          @default(now())

  @@index([waterId, status, caughtAt])
  @@index([status])
}
```

Add back-relations: in `model Water { ... }` add `catchReports CatchReport[]`; in `model FishSpecies { ... }` add `catchReports CatchReport[]`. (FishSpecies relation has no `onDelete: Cascade` — default Restrict — deleting a species in use must fail loudly.)

- [ ] **Step 2: Migrate + generate**

Run (from `apps/api`): `npx prisma migrate dev --name catch_reports` then `npx prisma generate`.
Expected: migration created + applied to the :5433 dev DB; client regenerated with `CatchReport` + `CatchReportStatus`.

- [ ] **Step 3: Shared DTO** — append to `packages/shared/src/index.ts`:

```ts
export interface CatchReportDto {
  id: string;
  fishName: string;
  fishSlug: string;
  caughtAt: string;            // yyyy-mm-dd
  comment: string | null;
  photoThumbUrl: string | null;
  photoCardUrl: string | null;
  authorName: string;
  createdAt: string;
}

export type CatchReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export const CATCH_REPORT_STATUSES: CatchReportStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
```

Rebuild shared: `npm run build -w @fishing/shared` (or the repo's shared build script). Expected: clean.

- [ ] **Step 4: Create DTO** — `apps/api/src/catch-reports/dto/create-catch-report.dto.ts`:

```ts
import { Transform } from 'class-transformer';
import { IsDateString, IsEmail, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCatchReportDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  authorName!: string;

  @IsOptional()
  @IsEmail()
  authorEmail?: string;

  // multipart → arrives as string; coerce to number
  @Transform(({ value }) => Number(value))
  @IsInt()
  fishId!: number;

  // ISO date string (yyyy-mm-dd); range checked in the service
  @IsDateString()
  caughtAt!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  comment?: string;

  /** Honeypot — whitelisted to avoid 400, but the service rejects non-empty values. */
  @IsOptional()
  @IsString()
  website?: string;
}
```

- [ ] **Step 5: Query DTO** — `apps/api/src/catch-reports/dto/catch-reports-query.dto.ts`:

```ts
import { IsInt, IsOptional, Min } from 'class-validator';
import { LangQueryDto } from '../../common/lang-query.dto';

export class CatchReportsQueryDto extends LangQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;
}
```

- [ ] **Step 6: Mapper** — `apps/api/src/catch-reports/catch-reports.mapper.ts`:

```ts
import { CatchReportDto, Locale } from '@fishing/shared';
import { CatchReport, FishSpecies } from '@prisma/client';

export function toCatchReportDto(row: CatchReport & { fish: FishSpecies }, lang: Locale): CatchReportDto {
  let photoThumbUrl: string | null = null;
  let photoCardUrl: string | null = null;
  if (row.photoUrl) {
    photoThumbUrl = row.photoUrl.replace('-full.webp', '-thumb.webp');
    photoCardUrl = row.photoUrl.replace('-full.webp', '-card.webp');
  }
  return {
    id: row.id,
    fishName: lang === 'en' ? row.fish.nameEn : row.fish.name,
    fishSlug: row.fish.slug,
    caughtAt: row.caughtAt.toISOString().slice(0, 10),
    comment: row.comment ?? null,
    photoThumbUrl,
    photoCardUrl,
    authorName: row.authorName,
    createdAt: row.createdAt.toISOString(),
  };
}
```

- [ ] **Step 7: Service** — `apps/api/src/catch-reports/catch-reports.service.ts` (mirrors `SpotsService` photo handling + `ReviewsService` listApproved):

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CatchReportDto, Locale, Paginated } from '@fishing/shared';
import { CatchReportStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../media/storage.service';
import { CreateCatchReportDto } from './dto/create-catch-report.dto';
import { AdminCatchReportsQueryDto } from './dto/admin-catch-reports-query.dto';
import { toCatchReportDto } from './catch-reports.mapper';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const SIZES = [
  { suffix: 'thumb', width: 320 },
  { suffix: 'card', width: 640 },
  { suffix: 'full', width: 1600 },
] as const;
const PER_PAGE = 8;

@Injectable()
export class CatchReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ── Public ──────────────────────────────────────────────────────────────
  async listApproved(slug: string, page: number, lang: Locale): Promise<Paginated<CatchReportDto>> {
    const water = await this.prisma.water.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!water) throw new NotFoundException(`Water "${slug}" not found`);

    const where = { waterId: water.id, status: 'APPROVED' as CatchReportStatus };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.catchReport.count({ where }),
      this.prisma.catchReport.findMany({
        where,
        include: { fish: true },
        orderBy: [{ caughtAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
    ]);
    return { items: rows.map((r) => toCatchReportDto(r, lang)), total, page, perPage: PER_PAGE };
  }

  async create(slug: string, dto: CreateCatchReportDto, file?: Express.Multer.File): Promise<{ ok: true }> {
    if (dto.website && dto.website.trim().length > 0) throw new BadRequestException('Spam detected');

    const water = await this.prisma.water.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!water) throw new NotFoundException(`Water "${slug}" not found`);

    const fish = await this.prisma.fishSpecies.findUnique({ where: { id: dto.fishId }, select: { id: true } });
    if (!fish) throw new BadRequestException('Невідомий вид риби');

    const caught = new Date(dto.caughtAt);
    if (Number.isNaN(caught.getTime())) throw new BadRequestException('Невірна дата вилову');
    const now = new Date();
    if (caught.getTime() > now.getTime()) throw new BadRequestException('Дата вилову не може бути в майбутньому');
    const yearAgo = new Date(now.getTime() - 366 * 24 * 3600 * 1000);
    if (caught.getTime() < yearAgo.getTime()) throw new BadRequestException('Дата вилову задавня');

    const hasComment = !!dto.comment && dto.comment.trim().length > 0;
    if (!file && !hasComment) throw new BadRequestException('Додайте фото або коментар');

    let photoUrl: string | undefined;
    const id = randomUUID();
    if (file) {
      if (!ALLOWED_MIME.includes(file.mimetype)) throw new BadRequestException('Непідтримуваний формат файлу');
      try {
        for (const { suffix, width } of SIZES) {
          const buf = await sharp(file.buffer)
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          await this.storage.save(`catch-reports/${id}/${id}-${suffix}.webp`, buf);
        }
      } catch {
        for (const { suffix } of SIZES) {
          await this.storage.delete(`catch-reports/${id}/${id}-${suffix}.webp`);
        }
        throw new BadRequestException('Не вдалося обробити зображення');
      }
      photoUrl = `/uploads/catch-reports/${id}/${id}-full.webp`;
    }

    await this.prisma.catchReport.create({
      data: {
        id,
        waterId: water.id,
        fishId: dto.fishId,
        caughtAt: caught,
        comment: hasComment ? dto.comment : null,
        photoUrl,
        authorName: dto.authorName,
        authorEmail: dto.authorEmail,
        status: 'PENDING',
      },
    });
    return { ok: true };
  }

  // ── Admin ───────────────────────────────────────────────────────────────
  async adminList(q: AdminCatchReportsQueryDto) {
    const where = q.status ? { status: q.status as CatchReportStatus } : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.catchReport.count({ where }),
      this.prisma.catchReport.findMany({
        where,
        include: { fish: { select: { name: true } }, water: { select: { slug: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
    ]);
    return { items: rows, total, page: q.page, perPage: q.perPage };
  }

  async moderate(id: string, status: CatchReportStatus): Promise<void> {
    await this.prisma.catchReport.update({ where: { id }, data: { status } });
  }

  async remove(id: string): Promise<void> {
    const row = await this.prisma.catchReport.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`CatchReport "${id}" not found`);
    await this.prisma.catchReport.delete({ where: { id } });
    await this.storage.deleteDir(`catch-reports/${id}`);
  }
}
```

- [ ] **Step 8: Public controller** — `apps/api/src/catch-reports/catch-reports.controller.ts` (mirror `ReviewsController` + spot's `FileInterceptor`):

```ts
import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CatchReportsService } from './catch-reports.service';
import { CreateCatchReportDto } from './dto/create-catch-report.dto';
import { CatchReportsQueryDto } from './dto/catch-reports-query.dto';

@Controller('waters/:slug/catch-reports')
export class CatchReportsController {
  constructor(private readonly service: CatchReportsService) {}

  @Get()
  list(@Param('slug') slug: string, @Query() q: CatchReportsQueryDto) {
    return this.service.listApproved(slug, q.page, q.lang);
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @UseInterceptors(
    FileInterceptor('photo', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  create(
    @Param('slug') slug: string,
    @Body() dto: CreateCatchReportDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.create(slug, dto, file);
  }
}
```

- [ ] **Step 9: Module + register** — `apps/api/src/catch-reports/catch-reports.module.ts` (admin pieces are added in Task 2; create the file now importing both controllers so Task 2 only fills them in — OR create the public-only module now and add admin in Task 2. Create public-only now):

```ts
import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { MediaModule } from '../media/media.module';
import { CatchReportsController } from './catch-reports.controller';
import { CatchReportsService } from './catch-reports.service';

@Module({
  imports: [AdminAuthModule, MediaModule],
  controllers: [CatchReportsController],
  providers: [CatchReportsService],
  exports: [CatchReportsService],
})
export class CatchReportsModule {}
```

Register in `apps/api/src/app.module.ts`: import `CatchReportsModule` and add it to the `imports` array (after `BiteModule`).

> Note: Step 7's service imports `AdminCatchReportsQueryDto`, which is created in Task 2. To keep Task 1 building independently, create a minimal `apps/api/src/catch-reports/dto/admin-catch-reports-query.dto.ts` now (full version in Task 2) — OR write Task 1's `adminList` against the DTO and accept that the api build completes only after Task 2's DTO exists. **Decision:** create the admin query DTO file in Step 7 of this task (copy the Task 2 Step 1 content) so the api compiles at the end of Task 1.

**Verify (capture):**
1. `npm run build` for shared + api clean (no TS errors). Restart the api dev server.
2. Seed/identify a PUBLISHED demo water slug (e.g. `ozero-navariia`) and a valid `fishId` (`curl -s 'http://localhost:3000/api/fish-species?lang=uk'` → pick an id).
3. Create with comment only (no photo): `curl -s -X POST 'http://localhost:3000/api/waters/ozero-navariia/catch-reports' -F 'authorName=Тест' -F 'fishId=<ID>' -F 'caughtAt=2026-06-14' -F 'comment=Чудовий вечір, взяв на фідер'` → `{"ok":true}`.
4. Required-field rule: same POST with **no** photo and **no** comment → 400 «Додайте фото або коментар».
5. Future date → 400 «...майбутньому»; honeypot `-F 'website=x'` → 400 «Spam detected»; bad `fishId=999999` → 400 «Невідомий вид риби»; bad slug → 404.
6. `GET /api/waters/ozero-navariia/catch-reports?lang=uk` → the just-created report is **NOT** listed (still PENDING). (We approve it in Task 2.)
7. `:slug` water route still works: `curl -s 'http://localhost:3000/api/waters/ozero-navariia?lang=uk'` → 200 (the nested `catch-reports` route did not shadow it).
8. Photo path: create with `-F 'photo=@<some.jpg>'` → `{"ok":true}`; confirm `apps/api` uploads dir has `catch-reports/<id>/<id>-{thumb,card,full}.webp`.

Commit: `feat(api): catch reports model + public create/list endpoints`.

## Task 2: API — admin moderation

**Files:**
- Create: `apps/api/src/catch-reports/dto/admin-catch-reports-query.dto.ts`
- Create: `apps/api/src/catch-reports/dto/moderate-catch-report.dto.ts`
- Create: `apps/api/src/catch-reports/admin-catch-reports.controller.ts`
- Modify: `apps/api/src/catch-reports/catch-reports.module.ts` (add admin controller)

(If the admin query DTO was already created in Task 1 Step 9, keep it; ensure it matches below.)

- [ ] **Step 1: Admin query DTO** — `admin-catch-reports-query.dto.ts` (mirror `AdminReviewsQueryDto`):

```ts
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CatchReportStatus } from '@fishing/shared';

export class AdminCatchReportsQueryDto {
  // Optional with no default: omitted → all statuses (the "Всі" filter).
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: CatchReportStatus;

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

- [ ] **Step 2: Moderate DTO** — `moderate-catch-report.dto.ts` (mirror `ModerateReviewDto`):

```ts
import { IsIn } from 'class-validator';
import { CatchReportStatus } from '@prisma/client';

export class ModerateCatchReportDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: CatchReportStatus;
}
```

- [ ] **Step 3: Admin controller** — `admin-catch-reports.controller.ts` (mirror `AdminSpotsController`):

```ts
import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin-auth/admin.guard';
import { CatchReportsService } from './catch-reports.service';
import { AdminCatchReportsQueryDto } from './dto/admin-catch-reports-query.dto';
import { ModerateCatchReportDto } from './dto/moderate-catch-report.dto';

@Controller('admin/catch-reports')
@UseGuards(AdminGuard)
export class AdminCatchReportsController {
  constructor(private readonly service: CatchReportsService) {}

  @Get()
  list(@Query() q: AdminCatchReportsQueryDto) {
    return this.service.adminList(q);
  }

  @Patch(':id')
  moderate(@Param('id') id: string, @Body() dto: ModerateCatchReportDto) {
    return this.service.moderate(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

- [ ] **Step 4: Wire controller** — in `catch-reports.module.ts` add `AdminCatchReportsController` to `controllers`.

**Verify (capture):** (need an admin cookie — log in like `scripts/admin-e2e.mjs` or `curl` the login endpoint to capture the cookie jar)
1. `npm run build` api clean; restart api.
2. `GET /api/admin/catch-reports` without cookie → 401/403 (AdminGuard).
3. With cookie: `GET /api/admin/catch-reports?status=PENDING` → the report(s) from Task 1 appear, each row includes `fish.name` and `water { slug, name }`.
4. `PATCH /api/admin/catch-reports/<id>` body `{"status":"APPROVED"}` (with cookie) → 200.
5. Now `GET /api/waters/ozero-navariia/catch-reports?lang=uk` (public) → the approved report **is** listed, `fishName` localized, `caughtAt` = `2026-06-14`, `photoThumbUrl`/`photoCardUrl` derived when a photo exists.
6. `status=` omitted → all statuses; `status=APPROVED` → only approved.
7. `DELETE /api/admin/catch-reports/<id>` (with cookie) on a photo report → 200; confirm `catch-reports/<id>` upload dir removed.

Commit: `feat(api): admin moderation for catch reports`.

## Task 3: Web (public) — reports section + submission form on the water page

**Files:**
- Modify: `apps/web/src/app/core/api.service.ts` (+`waterCatchReports`, `+submitCatchReport`)
- Modify: `apps/web/src/app/features/water-detail/water-detail.ts` (signals + load + submit; `fishSpecies` for the dropdown)
- Modify: `apps/web/src/app/features/water-detail/water-detail.html` (section + form, placed after the reviews section)
- Modify: `apps/web/src/app/features/water-detail/water-detail.scss` (section/card/form styles — reuse existing review-section styles where possible)
- Modify: i18n dictionaries (uk + en) — add `catchReport.*` keys (find them the same place `nav.*`/`nearby.*` live; the implementer greps for `"nearby"` to locate the files)

- [ ] **Step 1: api.service** — add (import `CatchReportDto` into the existing `@fishing/shared` import):

```ts
waterCatchReports(slug: string, page = 1): Observable<Paginated<CatchReportDto>> {
  return this.http.get<Paginated<CatchReportDto>>(`${this.base}/api/waters/${slug}/catch-reports`, {
    params: this.params({ page }),
  });
}

submitCatchReport(slug: string, fd: FormData): Observable<{ ok: true }> {
  return this.http.post<{ ok: true }>(`${this.base}/api/waters/${slug}/catch-reports`, fd);
}
```

- [ ] **Step 2: water-detail.ts** — add state + logic (alongside the existing reviews/review-form code):

```ts
// near other imports
import { CatchReportDto, FishSpeciesDto } from '@fishing/shared';

// fields
readonly catches = signal<Paginated<CatchReportDto> | null>(null);
readonly catchesPage = signal(1);
readonly catchesLoading = signal(false);
readonly fishOptions = signal<FishSpeciesDto[]>([]);
readonly crFormOpen = signal(false);

// catch-report form state
readonly crName = signal('');
readonly crEmail = signal('');
readonly crFishId = signal<number | null>(null);
readonly crDate = signal(this.todayStr());
readonly crComment = signal('');
readonly crFile = signal<File | null>(null);
readonly crHp = signal('');
readonly crPending = signal(false);
readonly crSuccess = signal(false);
readonly crError = signal<string | null>(null);

private todayStr(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
```

In the constructor, after `this.loadReviews(1)` (inside the `water()` next handler), also `this.loadCatches(1);` and load fish options for the dropdown: `this.api.fishSpecies().subscribe((f) => this.fishOptions.set(f));`

Add methods:

```ts
private loadCatches(page: number): void {
  this.catchesLoading.set(true);
  this.api.waterCatchReports(this.slug, page).subscribe({
    next: (r) => { this.catches.set(r); this.catchesPage.set(page); this.catchesLoading.set(false); },
    error: () => this.catchesLoading.set(false),
  });
}

onCatchesPageChange(page: number): void { this.loadCatches(page); }

onCrFile(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.crFile.set(input.files?.[0] ?? null);
}

get crValid(): boolean {
  const hasComment = this.crComment().trim().length > 0;
  const hasPhoto = !!this.crFile();
  return this.crName().trim().length >= 2 && this.crFishId() != null && !!this.crDate() && (hasComment || hasPhoto);
}

submitCatch(): void {
  if (!this.crValid || this.crPending()) return;
  this.crPending.set(true);
  this.crError.set(null);
  const fd = new FormData();
  fd.append('authorName', this.crName().trim());
  if (this.crEmail().trim()) fd.append('authorEmail', this.crEmail().trim());
  fd.append('fishId', String(this.crFishId()));
  fd.append('caughtAt', this.crDate());
  if (this.crComment().trim()) fd.append('comment', this.crComment().trim());
  if (this.crFile()) fd.append('photo', this.crFile() as File);
  if (this.crHp()) fd.append('website', this.crHp());
  this.api.submitCatchReport(this.slug, fd).subscribe({
    next: () => { this.crPending.set(false); this.crSuccess.set(true); },
    error: (err) => {
      this.crPending.set(false);
      const msg = err?.error?.message;
      this.crError.set(typeof msg === 'string' ? msg : null);
    },
  });
}
```

Ensure `FishSpeciesDto`, `CatchReportDto` are imported, and `Pager` is already imported (it is).

- [ ] **Step 3: water-detail.html** — add a section after the reviews section. Use the project's `'catchReport.*'` transloco keys and the existing `Pager`/`formatDate`. Template:

```html
<section class="cr-section container">
  <h2 class="cr-section__title">{{ 'catchReport.title' | transloco }}</h2>

  @if (catches(); as c) {
    @if (c.items.length) {
      <div class="cr-grid">
        @for (r of c.items; track r.id) {
          <article class="cr-card">
            @if (r.photoCardUrl) {
              <img class="cr-card__photo" [src]="r.photoCardUrl" [alt]="r.fishName" loading="lazy" />
            } @else {
              <div class="cr-card__photo cr-card__photo--placeholder">🎣</div>
            }
            <div class="cr-card__body">
              <span class="cr-card__fish">{{ r.fishName }}</span>
              <span class="cr-card__date">{{ formatDate(r.caughtAt) }}</span>
              @if (r.comment) { <p class="cr-card__comment">{{ r.comment }}</p> }
              <span class="cr-card__author">{{ r.authorName }}</span>
            </div>
          </article>
        }
      </div>
      <app-pager [page]="catchesPage()" [total]="c.total" [perPage]="c.perPage" (pageChange)="onCatchesPageChange($event)" />
    } @else {
      <p class="cr-empty">{{ 'catchReport.empty' | transloco }}</p>
    }
  }

  @if (!crSuccess()) {
    <button type="button" class="cr-toggle" (click)="crFormOpen.set(!crFormOpen())">
      {{ 'catchReport.add' | transloco }}
    </button>
  }

  @if (crFormOpen() && !crSuccess()) {
    <form class="cr-form" (ngSubmit)="submitCatch()">
      <label class="cr-form__field">
        <span>{{ 'catchReport.fish' | transloco }}</span>
        <select [ngModel]="crFishId()" (ngModelChange)="crFishId.set($event)" name="fishId" required>
          <option [ngValue]="null" disabled>{{ 'catchReport.fishPlaceholder' | transloco }}</option>
          @for (f of fishOptions(); track f.id) {
            <option [ngValue]="f.id">{{ f.name }}</option>
          }
        </select>
      </label>

      <label class="cr-form__field">
        <span>{{ 'catchReport.date' | transloco }}</span>
        <input type="date" [ngModel]="crDate()" (ngModelChange)="crDate.set($event)" name="caughtAt" [max]="crDate()" required />
      </label>

      <label class="cr-form__field">
        <span>{{ 'catchReport.photo' | transloco }}</span>
        <input type="file" accept="image/*" (change)="onCrFile($event)" name="photo" />
      </label>

      <label class="cr-form__field">
        <span>{{ 'catchReport.comment' | transloco }}</span>
        <textarea [ngModel]="crComment()" (ngModelChange)="crComment.set($event)" name="comment" maxlength="1000" rows="3"></textarea>
      </label>

      <label class="cr-form__field">
        <span>{{ 'catchReport.name' | transloco }}</span>
        <input type="text" [ngModel]="crName()" (ngModelChange)="crName.set($event)" name="authorName" minlength="2" maxlength="40" required />
      </label>

      <label class="cr-form__field">
        <span>{{ 'catchReport.email' | transloco }}</span>
        <input type="email" [ngModel]="crEmail()" (ngModelChange)="crEmail.set($event)" name="authorEmail" />
      </label>

      <!-- honeypot: visually hidden -->
      <input type="text" class="cr-form__hp" tabindex="-1" autocomplete="off" [ngModel]="crHp()" (ngModelChange)="crHp.set($event)" name="website" />

      @if (crError()) { <p class="cr-form__error">{{ crError() }}</p> }

      <button type="submit" class="cr-form__submit" [disabled]="!crValid || crPending()">
        {{ 'catchReport.submit' | transloco }}
      </button>
    </form>
  }

  @if (crSuccess()) {
    <p class="cr-form__success">{{ 'catchReport.success' | transloco }}</p>
  }
</section>
```

(The `.cr-form__hp` class must be visually hidden in scss: `position:absolute; left:-9999px; width:1px; height:1px; opacity:0;`.)

- [ ] **Step 4: water-detail.scss** — add styles for `.cr-section`, `.cr-grid` (responsive card grid, `min-width: 0` on items to avoid mobile overflow — known gotcha), `.cr-card`, `.cr-form` (stacked fields), `.cr-form__hp` (hidden), success/error. Match the visual language of the existing review section.

- [ ] **Step 5: i18n** — add to uk + en dictionaries:

uk: `catchReport.title`="Останні звіти про вилов", `add`="Додати звіт про вилов", `empty`="Ще немає звітів — будьте першим!", `fish`="Риба", `fishPlaceholder`="Оберіть рибу", `date`="Дата вилову", `photo`="Фото (необов'язково)", `comment`="Коментар", `name`="Ваше ім'я", `email`="Email (необов'язково)", `submit`="Надіслати звіт", `success`="Дякуємо! Звіт з'явиться після модерації."

en: `title`="Recent catch reports", `add`="Add a catch report", `empty`="No reports yet — be the first!", `fish`="Fish", `fishPlaceholder`="Choose a fish", `date`="Date of catch", `photo`="Photo (optional)", `comment`="Comment", `name`="Your name", `email`="Email (optional)", `submit`="Submit report", `success`="Thank you! Your report will appear after moderation."

**Verify (capture):**
1. `npm run build` (web) clean; no new budget warnings; restart web dev.
2. SSR: `curl -s http://localhost:4201/vodoymy/<region>/<water> | grep -o 'Останні звіти про вилов'` → match; `/en/...` → "Recent catch reports". (Use the demo water's real path.)
3. Headless Chrome (puppeteer-core + system Chrome): open the water page → reports section visible. Open the form, fill fish + date (default today) + comment + name, submit → success message «...після модерації». Zero `NG0` errors.
4. Approve that report in admin (or via the Task 2 PATCH curl) → reload water page → the report card appears with fish name, date, comment, author; with a photo it shows the `card` webp; without, the 🎣 placeholder.
5. Mobile 390: section + form + cards no horizontal overflow.
6. EN mirror: form labels + fish names render in English (`?lang=en` resolves `fishName`).
7. Regression: review form on the same page still submits; weather/bite strips still render; zero `NG0`.

Commit: `feat(web): catch reports section + submission form on water page`.

## Task 4: Web (admin) — moderation dashboard

**Files:**
- Modify: `apps/web/src/app/features/admin/core/admin-api.service.ts` (+methods + `AdminCatchReport` interface)
- Create: `apps/web/src/app/features/admin/catch-reports/admin-catch-reports-list.ts`
- Create: `apps/web/src/app/features/admin/catch-reports/admin-catch-reports-list.html`
- Create: `apps/web/src/app/features/admin/catch-reports/admin-catch-reports-list.scss`
- Modify: `apps/web/src/app/features/admin/admin.routes.ts` (+`catch-reports` route)
- Modify: `apps/web/src/app/features/admin/shell/admin-shell.html` (+nav link)

- [ ] **Step 1: admin-api.service** — add (mirroring the Spots block) + interface:

```ts
// ── Catch reports ───────────────────────────────────────────────────────────
adminCatchReports(q: { status?: string; page?: number; perPage?: number }): Observable<Paginated<AdminCatchReport>> {
  let params = new HttpParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== '') params = params.set(k, String(v));
  }
  return this.http.get<Paginated<AdminCatchReport>>('/api/admin/catch-reports', { params });
}

moderateCatchReport(id: string, status: 'APPROVED' | 'REJECTED'): Observable<AdminCatchReport> {
  return this.http.patch<AdminCatchReport>(`/api/admin/catch-reports/${id}`, { status });
}

deleteCatchReport(id: string): Observable<{ ok: true }> {
  return this.http.delete<{ ok: true }>(`/api/admin/catch-reports/${id}`);
}
```

```ts
export interface AdminCatchReport {
  id: string;
  waterId: string;
  fishId: number;
  caughtAt: string;
  comment: string | null;
  photoUrl: string | null;
  authorName: string;
  authorEmail: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  fish: { name: string };
  water: { slug: string; name: string };
}
```

- [ ] **Step 2: admin-catch-reports-list** — clone `admin-reviews-list.ts/.html/.scss` and adapt:
  - selector `app-admin-catch-reports-list`; use `adminCatchReports`/`moderateCatchReport`/`deleteCatchReport`; rows typed `AdminCatchReport`.
  - Columns: photo thumb (derive thumb url from `photoUrl` via `.replace('-full.webp','-thumb.webp')`, or show 🎣 when null), fish (`row.fish.name`), caught date, comment (truncated), water (`row.water.name`, link to `/vodoymy/...` optional), author + email, status `Tag` (when «Всі»), actions approve/reject/delete (ConfirmDialog message: `Видалити звіт від «${row.authorName}»?`).
  - Same status filter Select (`На модерації` default + Схвалені/Відхилені/Всі), same lazy paging, same `statusSeverity`/`statusLabel`/`showStatusColumn` helpers. Drop the `stars()` helper (no rating).

- [ ] **Step 3: route** — in `admin.routes.ts` add inside the shell children:

```ts
{
  path: 'catch-reports',
  loadComponent: () => import('./catch-reports/admin-catch-reports-list').then((m) => m.AdminCatchReportsList),
},
```

- [ ] **Step 4: nav link** — in `admin-shell.html`, after the «Точки» link, add:

```html
<a
  routerLink="/admin/catch-reports"
  routerLinkActive="ash__nav-link--active"
  class="ash__nav-link"
  (click)="closeSidebar()"
>
  <span class="ash__nav-icon">🐟</span>
  <span>Звіти про вилов</span>
</a>
```

**Verify (capture):**
1. `npm run build` (web) clean; restart web.
2. Headless Chrome admin flow (reuse `scripts/admin-e2e.mjs` login): log in → click «Звіти про вилов» nav → table lists the PENDING report from Task 3. Approve it → it leaves the PENDING filter; switch to «Схвалені» → it appears. Zero `NG0`.
3. Status filter «Всі» shows the status column; delete a report via ConfirmDialog → row gone.
4. Mobile 390 admin: table/page no overflow (admin shell already responsive).

Commit: `feat(web): admin moderation dashboard for catch reports`.

## Task 5: Seed demo + sweep + review + merge

**Files:**
- Modify: the seed script (`apps/api/prisma/seed.ts` or wherever `SEED_DEMO` lives) — add 1 approved + 1 pending catch report on the premium demo water (Наварія), referencing an existing fish id.

- [ ] **Step 1: Seed demo reports** (guard behind `SEED_DEMO=1`, like the other demo data). One APPROVED (fish + caughtAt + comment, optionally a photo if the seed already copies demo images) and one PENDING. Re-run the demo seed; confirm the approved one shows on the water page and the pending one in the admin queue.

- [ ] **Step 2: Sweep** — restart dev fresh (`npm run dev`). Root `npm run build` clean. `node scripts/admin-e2e.mjs` → 8/8. Sitemap still 86 (no new route). Real-browser pass: water page reports section + submit (uk + en) + mobile; admin dashboard approve/reject/delete; regression headless across home/catalog/detail/karta/blog/kalendar/poruch → zero `NG0`. Confirm `:slug` water route not shadowed and `/api/waters/nearby` still works.

- [ ] **Step 3: Final holistic review** — dispatch a code-quality reviewer over the whole diff: required-field rule correct, honeypot + throttle present, photo cleanup on delete + on processing failure, XSS (author/comment interpolation-only, no `[innerHTML]`), no author email leaked to the public DTO, route order, no secrets, bilingual fish names, mobile responsive. Fix findings.

- [ ] **Step 4: Merge** — merge `feature/catch-reports` to `main` (the user pushes to origin themselves).

## Done criteria

`CatchReport` model + migration applied; public create (multipart photo, honeypot, 5/hr throttle, required fish + non-future date + photo-or-comment rule) and approved-list endpoints; admin list/approve/reject/delete (with photo dir cleanup); water page «Останні звіти про вилов» section + working submission form (bilingual); admin dashboard page + nav link; XSS-safe; public DTO leaks no email/status; clean builds; admin-e2e 8/8; sitemap unchanged at 86; no new public route.
