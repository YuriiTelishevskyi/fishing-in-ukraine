# View counter + stocking/news + rivers — Design (3 cycles)

> Date: 2026-06-15. Remaining goldfishnet-borrow ideas, approved as three sequential cycles. Each cycle = own branch, spec/plan, subagent impl + two-stage review, final gate, merge.

## Cycle 1 — Per-water view counter + «популярні» sort

**Goal:** social-proof popularity signal + a "popular" catalog sort.

- **Model:** `Water.viewCount Int @default(0)`.
- **Increment:** in `WatersService.bySlug` — fire-and-forget `prisma.water.update({ where:{id}, data:{ viewCount:{ increment:1 } } }).catch(()=>{})` (do NOT await; response returns the pre-increment value — off-by-one is irrelevant). **Approximate by design** (SSR + bots); precise analytics deferred to the deploy cycle. Angular's HTTP transfer cache means the client usually does NOT re-fetch on hydration, limiting double counting.
- **DTO:** add `viewCount: number` to `WaterListItemDto` (so `WaterDetailDto` inherits it). `toListItem` maps `w.viewCount`.
- **Catalog sort:** `WatersQueryDto.sort?: 'popular'` (`@IsIn(['popular'])`). `list()` orderBy: if `sort==='popular'` → `[{ isPremium:'desc' }, { viewCount:'desc' }, { createdAt:'desc' }]`, else the current `[{isPremium},{verified},{createdAt}]`. (Premium stays first either way — paid placement preserved.)
- **Web:** `WatersFilter.sort?`; catalog reads/writes `sort` query param (mirror existing filter params in `initFromUrl`/`apply`); a sort `<select>` («За замовчуванням»/«Популярні»). Show «👁 N» on water-detail (near rating/region) and a small «👁 N» on `water-card`. i18n `catalog.sort*` + `water.views`.
- **No new route → sitemap unchanged.**

## Cycle 2 — Stocking / news announcements (admin-managed)

**Goal:** official per-water announcements («Завезли 200 кг коропа», events) — fresh content + premium appeal. Distinct from angler catch-reports (those are UGC + premoderated; these are admin-authored, no moderation).

- **Model:** `WaterNews` { id, water (Cascade), waterId, `type` enum `STOCKING|NEWS`, title, titleEn?, body?, bodyEn?, `date @db.Date`, createdAt }. Index `[waterId, date]`.
- **API:** public `GET /api/waters/:slug/news?lang=` (recent first). Admin `GET/POST/PATCH/DELETE /api/admin/water-news` (AdminGuard) — list (filter by waterId), create, edit, delete. No moderation/honeypot (admin-authored). Shared `WaterNewsDto`.
- **Web public:** section «Новини та зариблення» on water-detail (badge 🐟 Зариблення / 📢 Новина, formatted date, title, body), newest first; empty → hidden. Bilingual. XSS: interpolation only.
- **Admin:** a dashboard `/admin/water-news` (PrimeNG table + a create/edit form with a water picker + type + date + title/body uk/en) OR an inline section in the water form. **Decision:** standalone dashboard `/admin/water-news` (mirrors articles list+form), water chosen from a dropdown — keeps the water form lean. Nav entry 📢.
- **No new public route → sitemap unchanged.**

## Cycle 3 — Rivers as a browse axis

**Goal:** browse/SEO waters by river — «Риболовля на Дністрі».

- **Model:** `River` { id, slug unique, name, nameEn } + `Water.riverId Int?` (FK `onDelete: SetNull`) + back-relation `River.waters`. Seed a River dictionary (Дністер, Стрий, Західний Буг, Свіча, Бистриця, Верещиця, Полтва…).
- **Data:** a research+verify Workflow (like Lviv waters) → seed ~6–8 **real verified** Lviv-oblast river stretches as `waterType: RIVER` waters, each with `riverId`, coords, fish — so river landing pages aren't empty. Add to `seedRealWaters()` dataset (`docs/superpowers/data/lviv-rivers.json`).
- **API:** `GET /api/rivers?lang=` (dictionary, like regions); `WatersQueryDto.river?` filter (`and.push({ river: { slug } })`); river appears in `WaterListItemDto`? (optional — add `riverSlug/riverName | null`). `GET /api/rivers/:slug/regions`? (skip — not needed).
- **Web:** river filter in catalog (`?river=slug`, dropdown like region); **landing pages `/richky/:river` ↔ `/en/rivers/:river`** (list waters on that river, content-gated noindex-when-empty, BreadcrumbList+ItemList, bilingual, colon/dash-safe titles «Риболовля на річці: {river}»). locale.service SEGMENTS += `rivers {uk:'richky', en:'rivers'}`. Routes in both trees.
- **Sitemap:** rivers with ≥1 published water → `/richky/:river` combos.
- Biggest cycle; mirrors the region/fish patterns established in Plan 13.

## Cross-cutting

No `*.spec.ts`. Bilingual everywhere. XSS interpolation-only. Premium-first ordering preserved. River data verified (no fabrication). Each cycle: clean builds, admin-e2e 8/8, mobile responsive, zero NG0, sitemap reported.

## Done criteria (per cycle)

C1: viewCount increments on detail view, exposed in DTOs, «👁 N» shown, catalog `?sort=popular` orders by views (premium first), sitemap unchanged. C2: WaterNews model + public list + admin CRUD; water page «Новини та зариблення» section; admin dashboard + nav; bilingual; sitemap unchanged. C3: River model + ~6–8 verified river waters seeded; catalog river filter; `/richky/:river` landing pages (bilingual, content-gated); rivers in sitemap; no fabricated data.
