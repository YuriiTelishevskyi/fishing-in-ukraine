# Звіти про вилов (Catch Reports) — Design

> Date: 2026-06-15. Benchmark feature borrowed from goldfishnet.in.ua («Звіти»), but tightened.

## Goal

Anglers post **catch reports** tied to a catalog water: which fish, when, an optional photo, an optional comment. Reports go through the same anonymous **pre-moderation** as reviews/spots, then appear in a **«Останні звіти про вилов»** section on that water's public page. This adds fresh, user-generated content to already-indexed water pages (engagement + long-tail SEO + social proof), and reinforces premium waters.

## Scope (locked with the user)

- **Attachment:** to a catalog water only (chosen from the catalog). No standalone GPS points.
- **Fields:** minimal — fish (required, from species list) + caught date (default today) + photo (optional) + comment (optional). **No weight, no gear/bait** (deferred).
- **Where shown:** the water's public page only. **No** global `/zvity` feed route (so sitemap stays 86).
- **Moderation:** PENDING → admin approves/rejects, same as reviews/spots.
- **Bilingual:** uk (primary) + en, like every other feature.

### Out of scope (explicitly)

Likes/replies, angler self-editing, global feed page, weight/gear fields, bite-calendar correlation, leaderboards, email notifications. These may come later; not now.

## Architecture

Mirror the existing `Spot` (photo upload + honeypot + bbox-style guard + admin moderation) and `Review` (nested `waters/:slug/...` route, pre-moderation, public list) modules. A catch report is conceptually "a review with a photo and a fish instead of a star rating," attached to a water. Reuse, don't reinvent:

- **Photo pipeline:** identical to `SpotsService.create` — `FileInterceptor('photo')` + `memoryStorage` (15 MB), `ALLOWED_MIME` jpeg/png/webp, `sharp().rotate().resize().webp()` into 3 sizes (`thumb` 320 / `card` 640 / `full` 1600) saved under `catch-reports/{id}/{id}-{suffix}.webp`; store `photoUrl = /uploads/catch-reports/{id}/{id}-full.webp`; mapper derives thumb/card via string replace.
- **Honeypot:** a `website` field on the create DTO; non-empty → 400 «Spam detected».
- **Throttle:** `@Throttle({ default: { limit: 5, ttl: 3600000 } })` (5/hour, same as spots — photo upload).
- **Fish dropdown:** the existing public `GET /api/fish-species?lang=` (returns `FishSpeciesDto[]`).
- **Admin moderation:** mirror `AdminSpotsController` / `AdminReviewsController` (AdminGuard, optional-status query DTO, `PATCH :id` moderate, `DELETE :id` removes row + photo dir via `storage.deleteDir`).

## Data model

New Prisma model + enum (in `apps/api/prisma/schema.prisma`). Mirrors `Spot`.

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
  caughtAt    DateTime          @db.Date          // date of catch (no time component needed)
  comment     String?
  photoUrl    String?
  authorName  String
  authorEmail String?
  status      CatchReportStatus @default(PENDING)
  createdAt   DateTime          @default(now())

  @@index([waterId, status, caughtAt])           // public: recent approved per water
  @@index([status])                              // admin: moderation queue
}
```

Back-relations to add: `Water.catchReports CatchReport[]` and `FishSpecies.catchReports CatchReport[]`. `fishId` has **no** `onDelete: Cascade` (default `Restrict`) — deleting a species in use should fail loudly, not silently drop reports; species deletion isn't an admin flow today anyway.

**Required-field rule (enforced in the service, not the schema):** a report must have `fishId` + `caughtAt` + **at least one of** (`photoUrl`, non-empty `comment`). If neither photo nor comment is present → 400 «Додайте фото або коментар». This keeps reports non-empty without making either field individually mandatory.

`caughtAt` validation: must be a valid date, **not in the future**, and not absurdly old (reject older than ~1 year) → 400. Default to today client-side.

## API

### Public — `apps/api/src/catch-reports/`

Nested under the water slug, mirroring `ReviewsController`:

- `@Controller('waters/:slug/catch-reports')`
- `GET ''` → `listApproved(slug, page)` → `Paginated<CatchReportDto>`, `PER_PAGE = 8`, only `APPROVED`, `orderBy: [{ caughtAt: 'desc' }, { createdAt: 'desc' }]`. 404 if water not PUBLISHED.
- `POST ''` → `@Throttle(5/hour)` + `FileInterceptor('photo')` → `create(slug, dto, file?)` → `{ ok: true }`. Resolves slug→waterId (404 if not PUBLISHED), honeypot check, required-field rule, validates `fishId` exists, processes photo exactly like spots, inserts `status: PENDING`.

`CatchReportDto` (shared) returned to the public — **no author email, no status, no internal ids beyond report id**:

```ts
export interface CatchReportDto {
  id: string;
  fishName: string;          // resolved by lang (name | nameEn)
  fishSlug: string;
  caughtAt: string;          // ISO date (yyyy-mm-dd)
  comment: string | null;
  photoThumbUrl: string | null;
  photoCardUrl: string | null;
  authorName: string;
  createdAt: string;
}
export type CatchReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export const CATCH_REPORT_STATUSES: CatchReportStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
```

`lang` comes from the query (`LangQueryDto` pattern) to resolve `fishName`.

### Admin — `AdminCatchReportsController`

- `@Controller('admin/catch-reports')` + `@UseGuards(AdminGuard)`
- `GET ''` (`AdminCatchReportsQueryDto`: optional `status` → all; `page`/`perPage`) → paginated rows **including** `fish { name }` and `water { slug, name }`, `orderBy createdAt desc`. Returns raw rows (admin sees email, photoUrl, status) — same shape style as admin spots/reviews.
- `PATCH :id` (`ModerateCatchReportDto { status }`) → moderate.
- `DELETE :id` → delete row + `storage.deleteDir('catch-reports/{id}')` (mirror `SpotsService.remove`).

No aggregate recompute (unlike reviews, catch reports don't affect `ratingAvg`).

### Module wiring

New `CatchReportsModule` (providers: `CatchReportsService`; controllers: public + admin; imports Prisma + Media/Storage) added to `app.module.ts` imports.

## Web — public

`apps/web/src/app/features/water-detail/` (extend the existing page; do **not** create a new route).

**Section «Останні звіти про вилов»** below reviews:
- Cards: photo thumb (or a fish-emoji placeholder when no photo), fish name, formatted `caughtAt`, comment, author name. Reuse `formatDate`.
- Pager (existing `Pager`) over `Paginated<CatchReportDto>`.
- Loaded after the water resolves, like reviews (`api.waterCatchReports(slug, page)`).

**Submission form** (inline in the section, gated behind a «Додати звіт» toggle to keep the page calm):
- Fish `<select>` populated from `api.fishSpecies()` (required).
- Caught date `<input type="date">`, default today, `max` = today.
- Photo `<input type="file" accept="image/*">` (optional).
- Comment `<textarea>` (optional, maxlength 1000).
- Author name (required, 2–40).
- Author email (optional).
- Honeypot `website` input, visually hidden.
- Client validity: name ok + fish chosen + (photo selected OR comment ≥ a few chars) + valid date.
- Submit builds `FormData` (mirror `submitSpot`) → `api.submitCatchReport(slug, fd)`; on success show «Дякуємо! Звіт з'явиться після модерації», on error surface server message. Signals-based state like the review form.

**XSS:** `comment`, `authorName`, `fishName` are user/dictionary text rendered via Angular interpolation only. No `[innerHTML]`. (These never enter a Leaflet popup, so no manual escaping needed here.)

**i18n:** new `catchReport.*` keys in uk/en dictionaries (section title, «Додати звіт», field labels, success/error, empty state «Ще немає звітів — будьте першим»). Bilingual fish names already handled server-side via `lang`.

**SEO:** no route changes, no sitemap changes. Optionally add the freshest approved report's date into the water page (not required). Water page stays indexed; reports are extra content on it.

## Web — admin

`apps/web/src/app/features/admin/catch-reports/admin-catch-reports-list.ts(.html/.scss)` — clone of `admin-reviews-list` / `admin-spots-list`:
- PrimeNG `Table` (lazy paginated), status `Select` filter (`На модерації` default, plus `Схвалені` / `Відхилені` / `Всі`), `Tag` for status, `ConfirmDialog` for delete.
- Columns: photo thumb, fish, caught date, comment (truncated), water name (link), author + email, status (when «Всі»), actions (approve / reject / delete).
- `AdminApiService`: add `adminCatchReports(params)`, `moderateCatchReport(id, status)`, `deleteCatchReport(id)` + `AdminCatchReport` interface.
- Add route in `admin.routes.ts` and a nav link «Звіти про вилов» in `admin-shell.html`.

## Error handling

- Bad/missing fish, future/ancient date, neither photo nor comment, oversize/unsupported image → 400 with a Ukrainian message (validation pipe + service guards).
- Unknown water slug or unpublished → 404.
- Photo processing failure → clean up partial files, 400 «Не вдалося обробити зображення» (mirror spots).
- Honeypot tripped → 400 «Spam detected».
- Throttle exceeded → 429 (global ThrottlerGuard).

## Testing approach

No `*.spec.ts` (project rule: tests deferred to the final phase). Verify via:
- Build (`npm run build`) clean across shared + api + web.
- `curl` the public + admin endpoints: create (with/without photo), required-field rejection, honeypot, future-date rejection, list returns only APPROVED, 404 on bad slug, `:slug` water route not shadowed, admin moderate/delete (with auth cookie).
- Headless Chrome (puppeteer-core + system Chrome): water page renders the section, form submits (FormData with a tiny image), success message shows; admin dashboard lists + approves; the approved report then appears on the water page. Zero `NG0` errors; mobile 390 no overflow. Bilingual check (uk + en fish names / labels).
- `node scripts/admin-e2e.mjs` still 8/8.
- Sitemap still 86.
- Optionally extend the seed (`SEED_DEMO=1`) with 1–2 demo catch reports (1 approved + 1 pending) on the premium demo water.

## Done criteria

`CatchReport` model + migration applied; public create (multipart, honeypot, throttle, required-field rule, fish + non-future date) and approved-list endpoints; admin moderation (list/approve/reject/delete + photo cleanup); water page shows «Останні звіти про вилов» with a working submission form; admin dashboard page + nav; bilingual; XSS-safe; clean builds; admin-e2e 8/8; sitemap unchanged at 86; no new public route.
