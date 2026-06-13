# V2.4 — Plan 8: Premium waters (paid placement)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. No *.spec.ts (project decision — verify via build + curl + headless Chrome).

**Goal:** Admin manually marks a water as premium (toggle + optional expiry date); premium waters sort first and get a golden badge/border across catalog, region pages, home, maps, water-detail "other waters", and fish pages. First monetization surface.

**Architecture:** Two scalar columns on `Water` (`isPremium`, `premiumUntil?`). Public sort = premium-first via Prisma `orderBy`. "Effective premium" (drives the public badge + DTO flag) = `isPremium && (!premiumUntil || premiumUntil > now)`. Premium is NEVER reflected in SEO/JSON-LD (paid placement must not alter organic semantics).

**Tech Stack:** NestJS + Prisma, Angular 20, Leaflet (map-pin factory), PrimeNG (admin ToggleSwitch + DatePicker).

**Spec:** docs/superpowers/specs/2026-06-12-premium-waters-display.md. Dev servers: api :3000, web :4201, Postgres :5433, admin admin/admin12345. Patterns: waters.mapper / waters.service (list/map/bySlug + "other waters" — verify how detail picks region siblings), admin-water-form (toggle/multiselect/details sections), map-pin.ts (divIcon variants), water-card (badges).

**KNOWN TRADEOFF (document, accept for MVP):** Prisma `orderBy` cannot compare `premiumUntil > now()`. Therefore SORT uses the raw `isPremium` boolean, while the BADGE + DTO `isPremium` use the effective (expiry-aware) value. Consequence: a water whose `premiumUntil` has passed keeps its top sort slot (but shows NO badge) until the admin toggles `isPremium` off. Acceptable because premium is admin-curated, low-volume, and the admin table shows the expiry. A future scheduled job could auto-clear expired `isPremium` — out of scope here.

---

## Task 1: API — premium fields, DTO, premium-first sort, admin write, seed

**Files:** apps/api prisma/schema.prisma (+isPremium, premiumUntil on Water; migration `add_premium`), packages/shared/src/index.ts (WaterListItemDto +isPremium boolean; WaterDetailDto +premiumUntil string|null for admin reuse), apps/api/src/waters/waters.mapper.ts (effective premium in toListItem; premiumUntil in toDetail), waters.service.ts (orderBy premium-first in list + mapPins + bySlug "other waters" if any + fish-filtered lists are the same list endpoint), admin-waters.service.ts (create/update accept isPremium/premiumUntil), dto/create-water.dto.ts (+isPremium IsOptional IsBoolean; premiumUntil IsOptional IsDateString), prisma/seed.ts (mark 1 demo water premium).

- Schema: `isPremium Boolean @default(false)`, `premiumUntil DateTime?` on Water. `@@index([isPremium])` optional (low volume — skip). Migrate from apps/api: `npx prisma migrate dev --name add_premium`.
- Shared: WaterListItemDto gains `isPremium: boolean` (the EFFECTIVE value). WaterDetailDto additionally gains `premiumUntil: string | null` (raw, for admin form prefill — public detail can include it, harmless). Rebuild shared.
- waters.mapper toListItem: add `isPremium: w.isPremium && (!w.premiumUntil || w.premiumUntil > new Date())`. toDetail: also `premiumUntil: w.premiumUntil ? w.premiumUntil.toISOString() : null`. (mapPins toPin: spots layer is separate; the catalog MapPinDto — add isPremium there too: shared MapPinDto +`isPremium: boolean`, toPin computes effective, mapPins select must include isPremium+premiumUntil.)
- Public sort (waters.service): in `list()` change orderBy to `[{ isPremium: 'desc' }, { verified: 'desc' }, { createdAt: 'desc' }]`. In `mapPins()` no order needed (all pins shown) but select isPremium+premiumUntil for the gold pin. If `bySlug` returns "other waters in region" — find it; if such a query exists, premium-first there too; if NOT (detail has no siblings list currently), SKIP (don't invent it — the catalog/region list already covers premium-first; the spec's "other waters" point is satisfied wherever that list exists. Verify by reading waters.service/water-detail; note what you found).
- LIST_INCLUDE/FULL_INCLUDE: isPremium/premiumUntil are scalar Water columns — already selected by default; no include change. mapPins `select` MUST add isPremium + premiumUntil.
- admin-waters.service create/update: pass through isPremium (default false) + premiumUntil (parse to Date or null). CreateWaterDto: `@IsOptional() @IsBoolean() isPremium?` ; `@IsOptional() @IsDateString() premiumUntil?` (UpdateWaterDto extends it via PartialType — premiumUntil settable/clearable: allow null → send empty? class-validator IsDateString rejects null; accept `premiumUntil?: string` and treat ''/absent as clear. In service: `premiumUntil: dto.premiumUntil ? new Date(dto.premiumUntil) : null` when the key is present).
- Seed (SEED_DEMO=1): mark `ozero-navariia` premium (`isPremium: true`, `premiumUntil: null` = forever) so demo shows the badge + top sort.

**Verify (capture):**
1. builds (shared+api) pass; migration applied; seed → navariia isPremium.
2. GET /api/waters?region=lvivska-oblast → navariia FIRST; its item `isPremium:true`; others `isPremium:false`. GET /api/waters/map → pins include `isPremium` (navariia true).
3. GET /api/waters/ozero-navariia → `isPremium:true`, `premiumUntil:null`.
4. Expiry: admin-set a water `premiumUntil` in the past (PATCH via admin cookie with `{premiumUntil:"2020-01-01T00:00:00.000Z", isPremium:true}`) → its DTO `isPremium:false` (effective, expired) though still sorts among premium; future date → `isPremium:true`. Then clear it back (PATCH isPremium:false) to keep demo clean — leave only navariia premium.
5. SEO unaffected: GET /sitemap.xml count still 84; JSON-LD on detail has NO premium field.
6. Admin create with isPremium:true + premiumUntil future → persists; reflected in admin GET.

Commit: `feat(api): premium waters — fields, effective-premium DTO, premium-first sort, admin write`.

## Task 2: Public UI — golden badge + border, gold map pins, "Рекомендовані" home

**Files:** apps/web shared/water-card.ts|html|scss (premium badge + golden border), shared/map-pin.ts (+'premium' gold variant, slightly larger), features/map/map-page.ts (catalog pins use premium variant when pin.isPremium), features/home/home.* ("Рекомендовані" relabel; premium-first already from API), features/water-detail (if it lists region siblings — premium order from API; badge near name when water.isPremium), assets/i18n uk/en (+premium label), styles.scss (premium pin/badge css).

- water-card: when `water().isPremium` → golden badge top-left of cover «⭐ {{ 'premium.badge' | transloco }}» (gradient var(--accent)→#D97706, white text) + card golden border (`box-shadow` ring or `border: 1.5px solid #F2B705` + slightly stronger shadow). Don't break the verified badge (premium top-left, verified can move top-right or stack — verified currently top-left per existing scss; put PREMIUM top-left, VERIFIED top-right to avoid overlap; check water-card.html current badge positions and adjust).
- map-pin.ts: add `'premium'` gold variant (#F59E0B→#B45309, gold) — distinct from 'accent'(amber, used by admin picker) and 'community'(green). Size ~ +15% (iconSize 39×53 vs 34×46) and higher z. Keep existing variants.
- map-page.ts catalog layer: when rendering a catalog pin, choose `createMapPin(L, pin.isPremium ? 'premium' : 'primary')`. (MapPinDto now has isPremium from Task 1.) Premium pins added with higher zIndexOffset (e.g. +1000). Home map (home.ts) uses mapPins too — premium gold pins there as well (consistent; home is fine to show gold).
- home.ts/html: relabel the featured section heading key from `home.featured` to a new `home.recommended` («Рекомендовані»/“Recommended”) — premium-first ordering already comes from `api.waters({perPage:6})` (Task 1 sort). Keep the existing verified badge logic on cards (water-card handles it).
- water-detail: if the page shows other waters of the region (verify in Task 1 finding) — they inherit premium-first + badge via water-card. Add a premium badge near the H1 title when `water().isPremium` (small gold pill). If no siblings list exists, just the title badge.
- i18n keys uk/en: premium.badge «Преміум»/“Premium”; home.recommended «Рекомендовані»/“Recommended”.
- styles.scss: `.brand-pin--premium` (already drop-shadow via .brand-pin) maybe stronger; ensure gold pin readable.

**Verify (capture):**
1. build clean; public initial bundle ~unchanged (no budget warning).
2. SSR: /vodoymy/lvivska-oblast → navariia card has premium badge «Преміум» + first; `curl | grep -o 'Преміум' | head -1` matches. Home: «Рекомендовані» heading present; /en mirror «Recommended».
3. Headless Chrome /karta: catalog premium pin is the gold variant for navariia (grep premium pin svg/class), distinct from community green + catalog teal; zero NG0. /vodoymy: golden border on the premium card (computed style check or class presence). Mobile 390: badge doesn't overflow card; no horizontal overflow.
4. SEO: detail JSON-LD still has no premium field (confirm grep).

Commit: `feat(web): premium waters — golden badges, gold map pins and Recommended section`.

## Task 3: Admin — premium toggle + expiry date in form, table tag + filter

**Files:** apps/web features/admin/waters/admin-water-form.ts|html|scss (premium section: ToggleSwitch isPremium + DatePicker premiumUntil, in a «Преміум» panel; payload includes them — premiumUntil as ISO string or null when toggle off/date cleared), features/admin/waters/admin-waters-list.ts|html (premium column tag «⭐ до dd.MM.yyyy» / «⭐» (forever) / «—»; optional premium filter), admin-api.service.ts WaterPayload (+isPremium, premiumUntil).

- Form: new `.panel` section «Преміум»: PrimeNG ToggleSwitch bound to form control `isPremium`; PrimeNG DatePicker (p-datepicker) bound to `premiumUntil` (shown only when isPremium on; optional — empty = forever). On save: payload `isPremium` boolean; `premiumUntil` = the picked date toISOString() or null (when cleared/forever or toggle off → send null). Prefill in edit: isPremium from water.isPremium (NOTE: water-detail DTO `isPremium` is EFFECTIVE/expiry-aware — for the ADMIN form we want the RAW toggle state; the admin GET /api/admin/waters returns toDetail which computes effective isPremium → WRONG for the form. FIX: admin detail must expose the RAW isPremium + premiumUntil. Simplest: toDetail already adds premiumUntil (raw). For isPremium raw in admin, either add a separate field or have admin-waters.service return raw. Cleanest: WaterDetailDto.isPremium is effective (public correct); ADD nothing; instead in the admin form derive the toggle initial state as `!!water.premiumUntil || water.isPremium`? No — ambiguous. DECISION: add `premiumUntil` (raw, done in Task 1) AND make admin-waters.service.byId/list map a RAW isPremium. Simplest robust: in Task 1, toDetail sets `isPremium` = effective; for ADMIN add a small separate admin mapper field. To avoid two mappers: the admin form can reconstruct: toggle = (water as any) — NO. CLEAN FIX implemented here in Task 3: admin-waters.service returns the Prisma row's raw `isPremium` by overriding the DTO field after toDetail: `{ ...toDetail(w), isPremium: w.isPremium }` for admin list+byId. Do that.)
- Table: add column «Преміум»: p-tag accent when raw isPremium → label «⭐» + (premiumUntil ? `до ${dd.MM.yyyy}` : '∞'); else «—». (admin list already returns raw isPremium via the fix above + premiumUntil.) Optional: add «Преміум» to a filter — SKIP unless trivial (status filter already exists; premium filter is nice-to-have, do a simple client-side or skip; YAGNI → skip, just the column).
- admin-api WaterPayload: add `isPremium?: boolean; premiumUntil?: string | null`.

**Verify (capture):**
1. build clean; admin lazy; public bundle unchanged.
2. Headless CDP cookie: /admin/waters/<navaria id> → Преміум panel, toggle ON (raw), date empty (forever); table shows navariia «⭐ ∞» tag. Toggle a water on + set future date → save → admin GET reflects isPremium true + premiumUntil; public /api/waters that water now isPremium:true + badge. Turn it back off → clean. admin-e2e.mjs still 8/8 (form changed!).
3. Mobile 390 /admin/waters/<id>: premium panel no overflow.

Commit: `feat(web): admin premium toggle, expiry date and waters-table premium tag`.

## Task 4: Sweep + final review + merge

Restart dev fresh. Root build clean; admin-e2e 8/8; real-browser: premium badge+gold pin+first-sort on catalog/home/map, admin toggle round-trip; regression headless zero NG0 all pages; sitemap 84 + NO premium in JSON-LD (adversarial: confirm paid placement invisible to SEO); demo restored (only navariia premium, forever). Final holistic reviewer (incl. effective-vs-raw premium consistency: public badge expiry-aware, admin form shows raw toggle, sort tradeoff documented). Fix findings. Merge to main.

## Done criteria

Admin toggles premium (+ optional expiry) on a water; it sorts first and shows a golden badge + border on catalog/region/home/fish lists, a larger gold pin on maps, a title badge on its detail page; expired premium auto-hides the badge (sort tradeoff documented); SEO/JSON-LD unchanged; zero spec files; clean builds; public bundle ~unchanged; mobile responsive; admin-e2e 8/8.
