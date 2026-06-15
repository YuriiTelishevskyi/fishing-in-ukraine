# View Counter + Popular Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-water view counter that increments on detail page load, expose it in list + detail DTOs, and add a "popular" sort to the catalog (premium → viewCount desc → createdAt desc).

**Architecture:** Fire-and-forget Prisma increment in `bySlug` (no await, catch swallowed); new `sort` query param in DTO + service; Angular catalog gets a sort `<select>` that writes `?sort=popular` to URL; water-card and detail page show 👁 N count.

**Tech Stack:** NestJS + Prisma + PostgreSQL; Angular 20 SSR (Signals, Transloco); shared DTO package.

---

## Files modified / created

| Path | Action | Purpose |
|------|--------|---------|
| `apps/api/prisma/schema.prisma` | Modify | Add `viewCount Int @default(0)` to `Water` |
| `apps/api/prisma/migrations/` | Created by Prisma | `water_view_count` migration |
| `packages/shared/src/index.ts` | Modify | Add `viewCount: number` to `WaterListItemDto` |
| `apps/api/src/waters/waters.mapper.ts` | Modify | Map `w.viewCount` in `toListItem` |
| `apps/api/src/waters/waters.service.ts` | Modify | Fire-and-forget increment; conditional `orderBy` on `q.sort` |
| `apps/api/src/waters/dto/waters-query.dto.ts` | Modify | Add `sort?: string` with `@IsIn(['popular'])` |
| `apps/web/src/app/core/api.service.ts` | Modify | Add `sort?: string` to `WatersFilter`; pass in `params` |
| `apps/web/src/app/features/catalog/catalog.ts` | Modify | Read/write `sort` from URL in `initFromUrl` + `apply` |
| `apps/web/src/app/features/catalog/catalog.html` | Modify | Sort `<select>` in filter aside |
| `apps/web/src/app/shared/water-card.html` | Modify | 👁 viewCount indicator (conditional on > 0) |
| `apps/web/src/app/shared/water-card.scss` | Modify | `.wcard__views` subtle style |
| `apps/web/src/app/features/water-detail/water-detail.html` | Modify | 👁 N views in aside meta |
| `apps/web/src/assets/i18n/uk.json` | Modify | Sort + views keys (uk) |
| `apps/web/src/assets/i18n/en.json` | Modify | Sort + views keys (en) |

---

### Task 1: Prisma Schema — Add viewCount

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add `viewCount` field to `Water` model**

In `schema.prisma`, after the `ratingCount` line (line 83), add:
```prisma
  viewCount        Int            @default(0)
```

- [ ] **Step 2: Run migration**

From `apps/api/`:
```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine/apps/api
npx prisma migrate dev --name water_view_count
```
Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3: Run prisma generate**

```bash
npx prisma generate
```
Expected: `Generated Prisma Client ...`

---

### Task 2: Shared DTO — Add viewCount

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add `viewCount` to `WaterListItemDto`**

After `ratingCount: number;` (line 65), add:
```ts
  viewCount: number;
```

- [ ] **Step 2: Rebuild shared**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine
npm run build:shared
```
Expected: exits 0, `dist/` updated.

---

### Task 3: API Mapper — Map viewCount

**Files:**
- Modify: `apps/api/src/waters/waters.mapper.ts`

- [ ] **Step 1: Add `viewCount` to `toListItem` return object**

In `toListItem`, after `ratingCount: w.ratingCount,` add:
```ts
    viewCount: w.viewCount,
```

---

### Task 4: Waters Service — Increment + Popular Sort

**Files:**
- Modify: `apps/api/src/waters/waters.service.ts`

- [ ] **Step 1: Add fire-and-forget increment in `bySlug`**

After `if (!water) throw new NotFoundException(...)` and BEFORE `return toDetail(...)`:
```ts
    void this.prisma.water.update({ where: { id: water.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
```

- [ ] **Step 2: Add conditional orderBy in `list`**

Replace the hard-coded `orderBy` in `findMany` with:
```ts
    const orderBy: Prisma.WaterOrderByWithRelationInput[] =
      q.sort === 'popular'
        ? [{ isPremium: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }]
        : [{ isPremium: 'desc' }, { verified: 'desc' }, { createdAt: 'desc' }];
```
And pass `orderBy` into `findMany`:
```ts
      this.prisma.water.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy,
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
      }),
```

---

### Task 5: Query DTO — Add sort param

**Files:**
- Modify: `apps/api/src/waters/dto/waters-query.dto.ts`

- [ ] **Step 1: Add `sort` field**

After the `search` field block, add:
```ts
  @IsOptional()
  @IsIn(['popular'])
  sort?: string;
```

(`IsIn` is already imported from `class-validator`.)

---

### Task 6: Web ApiService — Wire sort filter

**Files:**
- Modify: `apps/web/src/app/core/api.service.ts`

- [ ] **Step 1: Add `sort` to `WatersFilter` interface**

After `perPage?: number;`, add:
```ts
  sort?: string;
```

- [ ] **Step 2: Pass `sort` in `waters()` params**

In the `waters(f)` `params({...})` call, add:
```ts
        sort: f.sort,
```

---

### Task 7: Catalog Component — Sort in URL + template

**Files:**
- Modify: `apps/web/src/app/features/catalog/catalog.ts`
- Modify: `apps/web/src/app/features/catalog/catalog.html`

- [ ] **Step 1: Read `sort` in `initFromUrl`**

In `initFromUrl`, in `this.f = { ... }`, add:
```ts
      sort: q.get('sort') ?? undefined,
```

- [ ] **Step 2: Write `sort` in `apply`**

In `apply`, in the `queryParams` object, add:
```ts
        sort: f.sort || null,
```

- [ ] **Step 3: Add sort `<select>` to catalog.html**

After the "Type" filter section and before the "Paid" section, add:
```html
      <!-- Sort -->
      <div class="filters__section">
        <span class="filters__label">{{ 'catalog.sortLabel' | transloco }}</span>
        <select
          class="filters__select"
          [value]="f.sort ?? ''"
          (change)="apply({ sort: $any($event.target).value || undefined })"
        >
          <option value="">{{ 'catalog.sortDefault' | transloco }}</option>
          <option value="popular">{{ 'catalog.sortPopular' | transloco }}</option>
        </select>
      </div>
```

---

### Task 8: Water Card — Show viewCount indicator

**Files:**
- Modify: `apps/web/src/app/shared/water-card.html`
- Modify: `apps/web/src/app/shared/water-card.scss`

- [ ] **Step 1: Add 👁 indicator to card template**

In `water-card.html`, inside `.wcard__geo` paragraph, after the `ratingCount` block:
```html
    @if (water().viewCount > 0) {
      <span class="wcard__views">👁 {{ water().viewCount }}</span>
    }
```

- [ ] **Step 2: Add subtle style for `.wcard__views`**

In `water-card.scss`, inside `.wcard { ... }`, after `&__distance { ... }`:
```scss
  &__views {
    display: inline-block;
    margin-left: 8px;
    color: var(--muted);
    font-size: 0.8rem;
  }
```

---

### Task 9: Water Detail — Show viewCount in aside

**Files:**
- Modify: `apps/web/src/app/features/water-detail/water-detail.html`

- [ ] **Step 1: Add 👁 N переглядів row in aside-card**

In `water-detail.html`, inside `<aside class="detail-aside">` → `<div class="aside-card card">`, after the verified badge block (after `</div>` for `aside-card__verified`), add:
```html
          <!-- View count -->
          @if (w.viewCount > 0) {
            <div class="aside-card__row aside-card__meta">
              <span>👁 {{ w.viewCount }} {{ 'water.views' | transloco }}</span>
            </div>
          }
```

---

### Task 10: i18n Keys

**Files:**
- Modify: `apps/web/src/assets/i18n/uk.json`
- Modify: `apps/web/src/assets/i18n/en.json`

- [ ] **Step 1: Add keys to uk.json**

In `"catalog": { ... }`, add after `"next": "Далі"`:
```json
    "sortLabel": "Сортування",
    "sortDefault": "За замовчуванням",
    "sortPopular": "Популярні"
```

In `"water": { ... }`, add after `"moreWaters": "..."`:
```json
    "views": "переглядів"
```

- [ ] **Step 2: Add keys to en.json**

In `"catalog": { ... }`, add after `"next": "Next"`:
```json
    "sortLabel": "Sort",
    "sortDefault": "Default",
    "sortPopular": "Popular"
```

In `"water": { ... }`, add after `"moreWaters": "..."`:
```json
    "views": "views"
```

---

### Task 11: Build + Verify

- [ ] **Step 1: Build API**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine
npm run build:api
```
Expected: exits 0.

- [ ] **Step 2: Restart API**

```bash
kill $(lsof -nP -iTCP:3000 -sTCP:LISTEN | awk 'NR>1{print $2}')
node /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine/apps/api/dist/main.js > /tmp/vc-api.log 2>&1 &
```

- [ ] **Step 3: Verify view counter climbing**

```bash
curl -s 'http://localhost:3000/api/waters/yavorivske-ozero?lang=uk' | python3 -c "import sys,json;print(json.load(sys.stdin).get('viewCount'))"
curl -s 'http://localhost:3000/api/waters/yavorivske-ozero?lang=uk' | python3 -c "import sys,json;print(json.load(sys.stdin).get('viewCount'))"
```
Expected: second ≥ first+1.

- [ ] **Step 4: Verify popular sort returns 200**

```bash
curl -s -o /dev/null -w "%{http_code}" 'http://localhost:3000/api/waters?lang=uk&sort=popular&perPage=5'
```
Expected: 200.

- [ ] **Step 5: Verify bad sort returns 400**

```bash
curl -s -o /dev/null -w "%{http_code}" 'http://localhost:3000/api/waters?lang=uk&sort=bogus'
```
Expected: 400.

- [ ] **Step 6: Build web**

```bash
npm run build:web
```
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: per-water view counter + popular catalog sort

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
