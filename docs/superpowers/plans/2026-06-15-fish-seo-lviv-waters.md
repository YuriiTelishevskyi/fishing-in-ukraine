# Plan 13: Fish-species SEO + real Lviv waters

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. NO `*.spec.ts` (verify via build + curl + headless Chrome). Capture verification output.

**Goal:** Populate the catalog with ~12–15 real verified Lviv-oblast waters (always-seeded, PUBLISHED), add region×fish SEO landing pages (`/ryba/:fish/:region`), and enrich the existing national `/ryba/:fish` pages.

**Architecture:** Real waters become an always-on `seedRealWaters()` (the 3 existing demo Lviv waters fold into it). A new `GET /api/fish-species/:slug/regions` returns per-region published-water counts. The region×fish page reuses the existing `GET /api/waters?region=&fish=` filter (no new list endpoint). Sitemap gains content-gated region×fish combos.

**Tech Stack:** NestJS+Prisma, Angular 20 SSR, @fishing/shared. Spec: `docs/superpowers/specs/2026-06-15-fish-seo-lviv-waters-design.md`. Dev: api :3000, web :4201, Postgres :5433. Patterns: `seed.ts` (water upsert shape + seedDictionaries/seedDemoWaters), `dictionaries.{controller,service}.ts` (fish-species endpoint + `loc()`), `seo.service.ts` (sitemap pages array), `fish/fish-page.{ts,html}` + `catalog` (page patterns), `locale.service.ts` (SEGMENTS + pathPair), `app.routes.ts` (tree()).

---

## Task 1: Research + verify the real Lviv waters dataset

**Output:** a verified TypeScript array literal (`REAL_LVIV_WATERS`) ready to paste into the seed (Task 3). Run as a verification workflow (coordinator handles this). NO code changes in this task — produce `docs/superpowers/data/lviv-waters.json` (or inline) with, per water:
`name`/`nameEn`, `description`/`descriptionEn`, `district`, `lat`, `lng`, `areaHa|null`, `waterType`, `isPaid`, `priceFrom|null`, `priceTo|null`, `priceNote|null`/`priceNoteEn|null`, `fishSlugs[]` (subset of the 18 seeded), `amenitySlugs[]` (subset of the 10 seeded), plus research-only `sourceUrl` + `confidence` (NOT seeded).

- Include the 3 existing real Lviv waters (Наварія `49.7665,23.9571`; Муроване `49.9052,24.1175`; Дністер-Розвадів `49.553,23.974`) — re-verify their coords.
- Candidates: well-documented Lviv-oblast waters — large lakes/reservoirs (Винниківське вдсх/«Львівське море», Яворівське озеро, Глинна-Наварія complex), named river stretches (Дністер, Стрий, Зх. Буг), established paid complexes near Lviv.
- **Adversarial verification:** each water's existence + coordinates + primary fish + paid/free confirmed against a real web source; coords must fall within Lviv-oblast bounds (lat ~48.7–50.6, lng ~22.6–25.2). **Exclude** any with unverifiable coordinates — do NOT fabricate. Keep ~12–15.
- Fish/amenity slugs MUST be from the seeded sets (fish: shchuka,korop,karas,sudak,okun,som,lyn,lyashch,plitka,krasnopirka,tovstolob,bilyi-amur,zherekh,holoven,forel,osetr,sazan,yorzh; amenities: altanky,nochivlia,chovny,parkovka,kafe,mahazyn,prokat-snastei,tualet,dush,elektryka).

**Verify (capture):** the dataset has ~12–15 entries, every entry has lat/lng inside Lviv bounds + ≥1 fishSlug, all fish/amenity slugs are valid, names unique. Report the list (name + coords + confidence + source).

Commit: `chore: verified real Lviv waters dataset`.

## Task 2: API — region-breakdown endpoint

**Files:**
- Modify `packages/shared/src/index.ts` (+`FishRegionCountDto`)
- Modify `apps/api/src/dictionaries/dictionaries.service.ts` (+`fishSpeciesRegions(slug, lang)`)
- Modify `apps/api/src/dictionaries/dictionaries.controller.ts` (+`GET fish-species/:slug/regions`)

- [ ] Shared DTO:
```ts
export interface FishRegionCountDto {
  regionSlug: string;
  regionName: string;
  count: number;
}
```
Rebuild shared.

- [ ] `dictionaries.service.ts` add (uses the existing `loc()` helper):
```ts
async fishSpeciesRegions(slug: string, lang: Locale): Promise<FishRegionCountDto[]> {
  const fish = await this.prisma.fishSpecies.findUnique({ where: { slug }, select: { id: true } });
  if (!fish) throw new NotFoundException(`Fish "${slug}" not found`);
  const rows = await this.prisma.water.findMany({
    where: { status: 'PUBLISHED', fish: { some: { fishId: fish.id } } },
    select: { region: { select: { slug: true, name: true, nameEn: true } } },
  });
  const map = new Map<string, { name: string; nameEn: string; count: number }>();
  for (const w of rows) {
    const r = w.region;
    const e = map.get(r.slug) ?? { name: r.name, nameEn: r.nameEn, count: 0 };
    e.count++;
    map.set(r.slug, e);
  }
  return [...map.entries()]
    .map(([regionSlug, e]) => ({ regionSlug, regionName: loc(lang, e.name, e.nameEn), count: e.count }))
    .sort((a, b) => b.count - a.count);
}
```
Import `NotFoundException` from `@nestjs/common`, `FishRegionCountDto` from `@fishing/shared`.

- [ ] `dictionaries.controller.ts` add (after the existing `fishSpecies` route):
```ts
@Get('fish-species/:slug/regions')
fishSpeciesRegions(@Param('slug') slug: string, @Query() q: LangQueryDto) {
  return this.dictionaries.fishSpeciesRegions(slug, q.lang);
}
```
Import `Param` from `@nestjs/common`.

**Verify (capture):** shared+api build clean; restart api. `curl -s 'http://localhost:3000/api/fish-species/korop/regions?lang=uk'` → array with `{regionSlug:'lvivska-oblast', regionName:'Львівська область', count:N}` (N = published Lviv carp waters). `?lang=en` → regionName 'Lviv Oblast'. Bad slug → 404. Counts match `GET /api/waters?region=lvivska-oblast&fish=korop` total.

Commit: `feat(api): per-region published-water counts for a fish species`.

## Task 3: Seed — real Lviv waters (always-on) + demo refactor

**Files:** Modify `apps/api/prisma/seed.ts`.

- [ ] Add `seedRealWaters()` modeled on the existing demo-waters upsert (resolve `lvivska-oblast` region id + fish/amenity ids by slug; `upsert({ where: { slug }, update: {}, create: {...} })`). Use the **verified dataset from Task 1**. Each water: `status: 'PUBLISHED'`, `verified: true`, `isPremium: false`, fish/amenities via `{ create: ids.map(...) }`. Generate `slug` via the existing slugify util (or a local transliteration matching it) from the uk name; ensure uniqueness within the set.
- [ ] Move the 3 Lviv waters OUT of `seedDemoWaters()` into `seedRealWaters()`. `seedDemoWaters()` either removed or kept only if it still adds non-Lviv demo waters (it doesn't → remove it and its call). Keep `seedDemoArticles/Reviews/Spots/CatchReports` (they reference `ozero-navariia`, now real). Optionally, in the SEED_DEMO block, bump `ozero-navariia` to `isPremium: true` for premium-feature demos.
- [ ] Wire `await seedRealWaters();` into `main()` **unconditionally** after `seedDictionaries()` (before the SEED_DEMO block).

**Verify (capture):**
1. api builds; run the seed the project way (`npm run db:seed` / `SEED_DEMO=1 npm run db:seed` from apps/api — check package.json). Completes without error; re-run is idempotent (counts stable).
2. WITHOUT SEED_DEMO: `curl -s 'http://localhost:3000/api/waters?lang=uk&perPage=50' | <count items>` → ~12–15 PUBLISHED Lviv waters. With SEED_DEMO=1 the UGC demo still attaches to `ozero-navariia`.
3. Spot-check 3 waters: coords inside Lviv bounds, fish attached, region = lvivska-oblast.
4. `GET /api/fish-species/korop/regions?lang=uk` now reflects the real carp-water count.

Commit: `feat(api): seed ~12-15 real verified Lviv-oblast waters as base data`.

## Task 4: Web — region×fish pages + enriched national fish pages + sitemap + i18n

**Files:**
- Modify `apps/web/src/app/core/api.service.ts` (+`fishSpeciesRegions`)
- Modify `apps/web/src/app/app.routes.ts` (+region×fish route in `tree()`)
- Create `apps/web/src/app/features/fish/fish-region-page.{ts,html,scss}`
- Modify `apps/web/src/app/features/fish/fish-page.{ts,html}` (enrich)
- Modify `apps/api/src/seo/seo.service.ts` (+region×fish combos)
- Modify i18n uk + en dictionaries (+`fishRegion.*`, +`fishPage.*` enrich keys)

- [ ] **api.service.ts** (import `FishRegionCountDto`):
```ts
fishSpeciesRegions(slug: string): Observable<FishRegionCountDto[]> {
  return this.http.get<FishRegionCountDto[]>(`${this.base}/api/fish-species/${slug}/regions`, { params: this.params() });
}
```

- [ ] **app.routes.ts** — add to `tree()` after the national fish route (line 22):
```ts
{ path: `${seg.fish}/:fishSlug/:regionSlug`, loadComponent: pages.fishRegion, data: { locale } },
```
and add `fishRegion: () => import('./features/fish/fish-region-page').then((m) => m.FishRegionPage),` to the `pages` map. (3-segment route under `ryba`/`fish` — no conflict with catalog `vodoymy/...` or the 2-segment national fish route.)

- [ ] **fish-region-page.ts** — standalone OnPush, model on `fish-page.ts`:
  - params `fishSlug` + `regionSlug`; `pair = this.locale.pathPair('fish', [fishSlug, regionSlug])` (confirm `pathPair` joins all params into `/ryba/:fish/:region`; if it only takes one param, extend it minimally or build the pair inline).
  - resolve names: `fishSpecies()` + `regions()` toSignals; `fishName`/`regionName` computed by slug.
  - load `api.waters({ region: regionSlug, fish: [fishSlug], page, perPage: 18 })` into items/total (same as fish-page).
  - SEO via `effect()` once both names resolve: title «Де ловити {fish} на {region} — FishMap.ua» / «Where to catch {fish} in {region} — FishMap.ua», localized description, `paths: this.pair`, BreadcrumbList (FishMap → {region catalog} → {fish}) + ItemList JSON-LD of items. **If `total()===0` after load → set robots noindex** (use SeoService's noindex option if present, else inject `Meta` and `meta.updateTag({name:'robots',content:'noindex'})`).
- [ ] **fish-region-page.html** — `<app-header [solid]="true" [pair]="pair" />`, hero with H1 `{{ 'fishRegion.title' | transloco: { fish: fishName(), region: regionName() } }}`, breadcrumbs, intro `{{ 'fishRegion.intro' | transloco: { fish: fishName(), region: regionName(), count: total() } }}`, the `grid grid--3` of `app-water-card` (loading skeletons + `fishRegion.empty` empty state), `app-pager`, `<app-footer />`. Mirror fish-page.html structure. Apply `min-width: 0` on grid items (mobile overflow gotcha).
- [ ] **fish-region-page.scss** — reuse fish-page styles (hero/content/empty); minimal additions.

- [ ] **Enrich fish-page.ts/html**:
  - ts: add `readonly regions = signal<FishRegionCountDto[]>([])`; in constructor `this.api.fishSpeciesRegions(this.slug).subscribe(r => this.regions.set(r))`. Add ItemList JSON-LD of `items()` to `applySeo` (alongside BreadcrumbList).
  - html: under the hero, add an intro `<p>{{ 'fishPage.intro' | transloco: { fish: fishName(), count: total() } }}</p>`; add a **«За областями»** section (when `regions().length`) listing each region as a `[routerLink]="locale.link('fish', [slug, r.regionSlug])"` link with `{{ r.regionName }} ({{ r.count }})`. (Confirm `locale.link(segment, params[])` builds `/ryba/:fish/:region`; mirror how other links pass params. Import `RouterLink`.)

- [ ] **seo.service.ts** — add region×fish combos. In the `Promise.all`, add a query:
```ts
this.prisma.waterFish.findMany({
  where: { water: { status: 'PUBLISHED' } },
  select: { fish: { select: { slug: true } }, water: { select: { region: { select: { slug: true } } } } },
}),
```
Dedupe `(fishSlug, regionSlug)` into a Set, then push to `pages`:
```ts
...fishRegionCombos.map((c) => ({ uk: `/ryba/${c.fish}/${c.region}`, en: `/en/fish/${c.fish}/${c.region}` })),
```
(Place after the `fish` section.)

- [ ] **i18n** (uk + en), with interpolation params:
  - `fishPage.intro` uk «{count} перевірених водойм України, де водиться {fish}: ціни, риба, карта, відгуки.» / en «{count} verified Ukrainian waters where {fish} is found: prices, fish, map, reviews.»
  - `fishPage.byRegion` uk «За областями» / en «By region».
  - `fishRegion.title` uk «Де ловити {fish} на {region}» / en «Where to catch {fish} in {region}».
  - `fishRegion.intro` uk «{count} водойм у регіоні {region}, де водиться {fish}.» / en «{count} waters in {region} where {fish} is found.»
  - `fishRegion.empty` uk «Поки немає водойм із цією рибою в цьому регіоні.» / en «No waters with this fish in this region yet.»
  - `fishRegion.crumbWaters` uk «Каталог» / en «Catalog» (breadcrumb root label, if not reusing an existing key).

**Verify (capture):**
1. shared+api+web build clean; no new bundle budget warning; restart dev.
2. SSR: `/ryba/korop/lvivska-oblast` → grep «Де ловити» + «Короп» + «Львівська»; `/en/fish/korop/lvivska-oblast` → «Where to catch». National `/ryba/korop` → intro text + «За областями» + a Lvivska link.
3. Headless Chrome: open `/ryba/korop` → intro + count + region link present; click the region link → lands on `/ryba/korop/lvivska-oblast` showing Lviv carp water cards + breadcrumbs; zero NG0; 390px no overflow. EN mirror. A 0-water combo (e.g. `/ryba/osetr/lvivska-oblast` if none) → empty state + `<meta name="robots" content="noindex">` present (grep SSR).
4. Sitemap: `curl -s http://localhost:3000/sitemap.xml | grep -c '<loc>'` → report the new count; confirm it now contains `/ryba/korop/lvivska-oblast` and does NOT contain empty combos. (Count grew vs 86 — expected.)
5. Real waters render in the catalog (`/vodoymy`) and on the map (`/karta`).
6. `node scripts/admin-e2e.mjs` → 8/8.

Commit: `feat(web): region×fish SEO landing pages + enriched fish pages + sitemap`.

## Task 5: Sweep + holistic review + merge

- [ ] Restart dev fresh. Root build clean. admin-e2e 8/8. Sitemap count reported (grown, region×fish combos present, no empty combos). Regression headless zero NG0 across home/catalog/detail/karta/blog/kalendar/poruch + fish + region×fish (uk+en), mobile 390. Real waters: catalog + map + a fish page show them; coords plausible.
- [ ] Final holistic reviewer over the whole branch diff: data not fabricated (coords in Lviv bounds, real names), no DRAFT leakage in counts/sitemap, region×fish noindex-when-empty, route order (no shadowing of catalog/water-detail), bilingual, XSS (interpolation only), seed idempotent + always-on, no secrets. Fix findings.
- [ ] Merge `feature/fish-seo-lviv-waters` to main (user pushes to origin).

## Done criteria

Per the spec's Done criteria: ~12–15 real verified Lviv waters seeded always-on (catalog populated w/o SEED_DEMO); `/api/fish-species/:slug/regions` returns per-region published counts; national fish pages enriched (intro+count+by-region+ItemList); region×fish pages live (`/ryba/:fish/:region` + en), bilingual, SEO-complete, noindex-when-empty; sitemap includes non-empty combos + new waters; clean builds; admin-e2e 8/8; zero NG0; mobile responsive; no fabricated data.
