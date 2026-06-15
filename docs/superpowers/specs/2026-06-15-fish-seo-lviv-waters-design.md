# Fish-species SEO + real Lviv waters — Design

> Date: 2026-06-15. Borrowed/extended from the goldfishnet benchmark: browse waters by fish. The basic fish filter + national `/ryba/:fish` pages already exist; this adds the long-tail region×fish layer and real catalog content.

## Goal

1. **Populate the catalog** with ~12–15 **real, verified** Lviv-oblast waters as always-seeded base data (PUBLISHED) so the catalog and all SEO pages have genuine content.
2. **Region×fish SEO landing pages** (`/ryba/:fish/:region`) — "Де ловити коропа на Львівщині" — content-gated long-tail, in the sitemap only where ≥1 published water exists.
3. **Enrich the existing national `/ryba/:fish` pages** (currently thin: just a water list + generic meta) with intro copy, a water count, a "by region" link section, and ItemList JSON-LD.

## Scope (locked with the user)

- SEO: region×fish landing pages **and** enrichment of existing national fish pages.
- Seed ~12–15 real Lviv waters.
- Store as **base seed (always-on), PUBLISHED**, idempotent upsert by slug.

### Out of scope

Region×fish pages pre-generated for all 26 regions (only content-gated combos exist); photos for real waters (added later via admin); waters outside Lviv oblast (future iterations); a generic per-region catalog SEO overhaul.

## What already exists (do not rebuild)

- Catalog fish filter: chips → `?fish=slug` → API `where: { fish: { some: { fish: { slug: { in } } } } }` (OR semantics). `apps/web/.../catalog/*`, `waters.service.ts:23-26`.
- National fish pages: `/ryba/:fishSlug` (uk) / `/en/fish/:fishSlug` (en) — `fish-page.ts` lists all waters with that fish, paginated, sets title/description + BreadcrumbList JSON-LD.
- Sitemap (`apps/api/src/seo/seo.service.ts`): includes home, static catalog/map/blog/calendar, 26 regions, published waters, fish species **with ≥1 published water**, published articles. Bilingual pairs.
- `GET /api/waters?region=&fish=&lang=&page=` already filters by region AND fish — the region×fish page reuses it directly; no new list endpoint needed.

## Part B — Real Lviv waters (base seed)

### Data acquisition (verified, not fabricated)

Research ~15–18 candidate Lviv-oblast waters, **adversarially verify** each (existence, coordinates, primary fish, paid/free) against real web sources, keep ~12–15 with confirmed coordinates. Low-confidence coordinates → exclude (do not fabricate). Prefer well-documented waters: large lakes/reservoirs (e.g. Винниківське/«Львівське море», Яворівське озеро/водосховище), named river stretches (Дністер, Стрий, Західний Буг sections), and established paid complexes near Lviv. The 3 existing demo Lviv waters (Наварія, Муроване, Дністер-Розвадів) are real → folded into this base set.

Each record (matching the seed's existing water shape):
`slug` (slugify uk name), `name`/`nameEn`, `description`/`descriptionEn` (2–3 sentences, real specifics), `district`, `lat`/`lng` (verified, ~4 decimals), `areaHa` (if known), `waterType` (LAKE/POND/RIVER/RESERVOIR/FISHING_COMPLEX), `isPaid` + `priceFrom`/`priceTo`/`priceNote` (only if a real price is known, else null + free), `fishSlugs` (from the 18 seeded species), `amenitySlugs` (from the 10 seeded), `verified: true`, `status: 'PUBLISHED'`, `isPremium: false`. A `sourceUrl`/confidence is tracked during research but NOT stored.

### Seed restructure

- New always-on `seedRealWaters()` (called unconditionally in `main()`, after `seedDictionaries()`), idempotent **upsert by slug** (like the current demo-waters upsert). Resolves `lvivska-oblast` region id + fish/amenity ids by slug.
- Remove the 3 waters from `seedDemoWaters()` (now in the real set); `SEED_DEMO` keeps article + reviews + spots + catch-reports, which reference `ozero-navariia` (now real). The demo block may still bump `ozero-navariia` to `isPremium: true` for premium-feature demos (optional).
- Net effect: catalog is populated even without `SEED_DEMO`.

## Part A — Fish SEO

### A1. Region-breakdown API

New `GET /api/fish-species/:slug/regions?lang=` → `FishRegionCountDto[]` = `{ regionSlug, regionName, count }`, for PUBLISHED waters containing that fish, grouped by region, `count desc`. Implemented in the dictionaries (or a small fish) service via Prisma groupBy / a grouped query. Shared DTO added. 404 if the fish slug doesn't exist.

### A2. Enrich national `/ryba/:fish` page

- Intro paragraph (i18n, with the fish name + total count interpolated): e.g. «Водойми України, де водиться {fish}: {count} перевірених місць — ціни, риба, карта, відгуки.»
- A **«За областями»** section: fetch `fishSpeciesRegions(slug)`; render each region as a link to the region×fish page (`/ryba/:fish/:region`) with its count.
- ItemList JSON-LD over the listed waters (alongside the existing BreadcrumbList). Keep existing title/description.

### A3. Region×fish landing page

- New standalone `FishRegionPage` component (model on `fish-page.ts` + `catalog`), route `${seg.fish}/:fishSlug/:regionSlug` in BOTH locale trees (uk `/ryba/:fish/:region`, en `/en/fish/:fish/:region`). No conflict with catalog (`vodoymy/...` root) or the 2-segment national fish route.
- Resolves fish name + region name (from `fishSpecies()` + `regions()` dictionaries by slug). Loads waters via `api.waters({ region, fish: [fishSlug], page })`.
- Renders: breadcrumbs (Каталог → {Область} → {Риба}), an H1 «Де ловити {рибу} на {області}» / «Where to catch {fish} in {region}», an intro paragraph, the water-card grid + pager, and a fallback empty state.
- SEO: title «Де ловити {рибу} на {області} — FishMap.ua», localized description, canonical + hreflang via the existing SeoService `paths` pair, BreadcrumbList + ItemList JSON-LD. **If the combo has 0 published waters → set `robots: noindex`** (defensive; the sitemap won't list empty combos anyway).
- i18n: `fishRegion.*` keys (title/intro/empty/breadcrumb) with interpolation params; `fish.*` enrichment keys (intro, byRegion heading, count). Add to uk + en. Bilingual fish/region names resolved server-side via `lang`.

### A4. Sitemap

In `seo.service.ts`, add a section: query the distinct `(fishSlug, regionSlug)` pairs that have ≥1 PUBLISHED water (a grouped query over `WaterFish` joined to water+region), and emit `{ uk: '/ryba/{fish}/{region}', en: '/en/fish/{fish}/{region}' }` for each. The total sitemap count will **grow** (more real waters + region×fish combos) — that is the intended outcome; verification reports the new exact count rather than asserting 86.

## Error handling

- Unknown fish slug on `/api/fish-species/:slug/regions` → 404.
- Region×fish page with unknown fish/region slug → render a graceful "not found / no waters" state (the catch-all SSR route still 200s the shell); 0-water combos → noindex.
- Region-breakdown query must only count PUBLISHED waters (no DRAFT leakage).

## Testing approach

No `*.spec.ts` (project rule). Verify via: builds clean (shared+api+web); `curl` the new region-breakdown endpoint (counts correct, only published, 404 on bad slug) and `GET /api/waters?region=lvivska-oblast&fish=korop` (returns Lviv carp waters); SSR curl + headless Chrome for the enriched national fish page (intro + count + region links) and the region×fish page (uk+en, H1, breadcrumbs, water cards, empty-state noindex), zero `NG0`, mobile 390 no overflow; the real waters appear in the catalog and on the map; sitemap count reported (grown, includes region×fish combos, no empty combos); `node scripts/admin-e2e.mjs` 8/8. Data sanity: every seeded water has verified coordinates inside Lviv-oblast bounds and ≥1 fish.

## Done criteria

~12–15 real verified Lviv waters seeded as always-on PUBLISHED base data (catalog populated without SEED_DEMO); `GET /api/fish-species/:slug/regions` returns per-region counts of published waters; national `/ryba/:fish` pages enriched (intro + count + by-region links + ItemList); region×fish landing pages live at `/ryba/:fish/:region` (+ `/en/...`), bilingual, SEO-complete, content-gated (noindex when empty); sitemap includes non-empty region×fish combos and the new waters; clean builds; admin-e2e 8/8; zero NG0; mobile responsive; no fabricated data.
