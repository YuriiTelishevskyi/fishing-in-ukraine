# V2.6 — Plan 10 (Cycle B): Bite calendar (календар кльову)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. No *.spec.ts (verify via build + curl + headless Chrome).

**Goal:** A 7-day fishing-activity ("bite") forecast — a transparent 0–5 score per day from pressure trend, wind, temperature, precipitation and moon phase — exposed at `GET /api/bite-forecast?lat=&lng=`, shown both as a dedicated SEO page `/kalendar-klyovu` (location via geolocation or a water dropdown) and a compact widget on every water-detail page.

**Architecture:** New `BiteForecastService` reusing the Cycle-A `OpenMeteoService` (exported from WeatherModule) for the daily/hourly data, plus a keyless astronomical moon-phase calc. Heuristic scoring is pure/deterministic. Web: a `BiteCalendar` page (dual route tree) + a `BiteStrip` widget reused on water-detail.

**Tech Stack:** NestJS, Angular 20 SSR, @fishing/shared, Transloco, no external API beyond Open-Meteo (already in use, keyless).

**Spec:** docs/superpowers/specs/2026-06-15-weather-bite-nearby-design.md (Цикл B). Dev servers: api :3000, web :4201, Postgres :5433. Open-Meteo reachable. Patterns: weather module (Cycle A — OpenMeteoService.fetchForecast returns OpenMeteoRaw; reuse it), water-detail.ts (SSR signal load), fish-page/blog-list (a simple public page with SEO), locale.service SEGMENTS, dropdown via PrimeNG? NO — public site uses plain selects (see hero/home select), keep it plain native select. i18n uk/en.

---

## Task 1: API — moon phase, BiteForecastService, endpoint, DTO

**Files:** packages/shared/src/index.ts (BiteDayDto, MoonPhaseDto, BiteForecastDto), apps/api/src/bite/moon.ts (pure moon-phase fn), apps/api/src/bite/bite-forecast.service.ts (scoring), apps/api/src/bite/bite.controller.ts (GET /api/bite-forecast), apps/api/src/bite/bite.module.ts (imports WeatherModule for OpenMeteoService), app.module.ts. Reuse apps/api/src/common/coords-query.dto.ts.

- Shared:
```ts
export interface MoonPhaseDto { phase: number; /*0..1*/ illumination: number; /*0..1*/ nameKey: string; /*moon.new|waxingCrescent|...*/ }
export interface BiteFactors { pressure: number; wind: number; temp: number; precip: number; moon: number; } // each 0..1
export interface BiteDayDto { date: string; score: number; /*0..5 int*/ factors: BiteFactors; moon: MoonPhaseDto; reasonKey: string; /*bite.reason.poor|fair|good|great*/ }
export interface BiteForecastDto { available: boolean; days: BiteDayDto[]; updatedAt: string | null; }
```
Rebuild shared.

- moon.ts: `moonPhase(date: Date): { phase: number; illumination: number }`. Use the standard synodic approximation: known new moon JD 2451550.1 (2000-01-06), synodic month 29.530588853 days. `daysSince = (date.getTime()/86400000 + 2440587.5) - 2451550.1; phase = ((daysSince % S) + S) % S / S` (0..1, 0=new, 0.5=full). `illumination = (1 - cos(2π*phase))/2`. Export. `moonNameKey(phase)`: 8 buckets → 'moon.new'(±.03), 'moon.waxingCrescent', 'moon.firstQuarter'(.25±.03), 'moon.waxingGibbous', 'moon.full'(.5±.03), 'moon.waningGibbous', 'moon.lastQuarter'(.75±.03), 'moon.waningCrescent'. moonIcon left to the web (emoji).
- bite-forecast.service.ts: `BiteForecastService(openMeteo: OpenMeteoService)`. `getForecast(lat,lng): Promise<BiteForecastDto>`:
  - raw = await openMeteo.fetchForecast(lat,lng); if null → {available:false, days:[], updatedAt:null}.
  - For each of the 7 daily indices i, compute factors (each 0..1):
    - **temp**: mid = (daily.temperature_2m_max[i]+daily.temperature_2m_min[i])/2. Best ~10–22°C → score 1 inside [12,20], linearly falling to 0 at ≤0 or ≥30. Helper `band(v, lo, hi, edgeLo, edgeHi)`.
    - **wind**: w = daily.wind_speed_10m_max[i] (km/h). Best ≤15 →1, linear to 0 at ≥40.
    - **precip**: pr = daily.precipitation_sum[i] (mm) + weather_code. Light (0.1–4mm or overcast codes 2,3,45,48,51,53) → ~1 (fish active under clouds/light rain); 0mm clear (code 0/1) → 0.6; heavy (>10mm or thunder 95-99) → 0.1.
    - **pressure**: derive a per-day pressure tendency from hourly.pressure_msl sliced to that calendar day (match hourly.time date prefix). dayChange = last - first of that day's msl values. Stable |dayChange|<2 hPa → 1; slowly falling (-2..-5) → 0.8 (good — pre-front feeding); sharp change (|.|>6) → 0.2. If no hourly for that day (days 3-7 may lack hourly pressure — Open-Meteo gives hourly for the forecast window; if missing use 0.6 neutral).
    - **moon**: m = moonPhase(new Date(date)); proximity to new(0) or full(0.5): boost. score = 0.6 + 0.4*max(closenessToNew, closenessToFull) where closeness = 1 - min(distToNewOrFull)/0.25 clamped 0..1. (New/full → ~1, quarters → ~0.6.)
    - **score (0..5)**: weighted = pressure*0.35 + wind*0.2 + temp*0.2 + precip*0.15 + moon*0.1 → round(weighted*5) clamped 0..5.
    - reasonKey: score>=4 'bite.reason.great', >=3 'bite.reason.good', >=2 'bite.reason.fair', else 'bite.reason.poor'.
    - moon DTO: {phase, illumination, nameKey: moonNameKey(phase)}.
  - days[7], available:true, updatedAt = raw fetched time (or new Date().toISOString()).
- bite.controller.ts: `@Controller('bite-forecast') @Get() get(@Query() q: CoordsQueryDto)` → biteForecast.getForecast(q.lat,q.lng).
- bite.module.ts: imports [WeatherModule] (for OpenMeteoService), providers [BiteForecastService], controllers [BiteController]. Wire in app.module.

**Verify (capture):**
1. builds (shared+api) pass.
2. `curl -s 'http://localhost:3000/api/bite-forecast?lat=49.77&lng=23.96'` → available:true, days.length 7, each day {date, score 0-5 int, factors (5 fields 0..1), moon{phase,illumination,nameKey}, reasonKey}. Print day[0] + day[3].
3. Determinism: two calls → identical scores (same cached weather + pure calc).
4. Bad coords lat=200 → 400.
5. Moon sanity: moonPhase for a known full moon date (e.g. 2025-01-13 was ~full) illumination > 0.9; a known new moon (2025-01-29) illumination < 0.1. Print both (run a tiny node snippet importing the compiled moon.js or test via the endpoint dates).
6. Score spread sanity: scores vary across the 7 days (not all identical) given varied weather.

Commit: `feat(api): bite-forecast service (pressure/wind/temp/precip/moon heuristic) and endpoint`.

## Task 2: Web — BiteStrip widget on water-detail + dedicated /kalendar-klyovu page

**Files:** apps/web core/api.service.ts (+biteForecast(lat,lng)), core/locale.service.ts (SEGMENTS += biteCalendar {uk:'kalendar-klyovu', en:'bite-calendar'}), shared/bite-strip.ts|html|scss (compact 7-day strip, reused), features/bite-calendar/bite-calendar.ts|html|scss (page), app.routes.ts (uk+en: biteCalendar route), features/water-detail/water-detail.ts|html (BiteStrip under weather card), layout/header.html + footer.html (+nav link), assets/i18n uk/en (+bite.*, moon.*), apps/api/src/seo/seo.service.ts (add /kalendar-klyovu ↔ /en/bite-calendar pair to sitemap).

- api.service: `biteForecast(lat,lng): Observable<BiteForecastDto>` GET /api/bite-forecast params lat,lng.
- locale.service SEGMENTS: add `biteCalendar: { uk: 'kalendar-klyovu', en: 'bite-calendar' }`. (Verify pathPair/link typing compiles.)
- bite-strip.ts (standalone OnPush): `forecast = input.required<BiteForecastDto>()`; optional `compact = input(false)`. Helpers: fishIcons(score) → string of score×'🐟' (or render score bars in template); moonIcon(nameKey) → emoji (new🌑 waxingCrescent🌒 firstQuarter🌓 waxingGibbous🌔 full🌕 waningGibbous🌖 lastQuarter🌗 waningCrescent🌘); weekday(date) via locale; reasonKey passthrough. Renders @if available: a row/grid of 7 day cells: weekday, a 0–5 fish-score visual (5 fish icons, filled vs faded by score), moon icon, (full mode) reason text. compact mode (water-detail) = just weekday + score fish + moon, smaller.
- bite-strip.scss: responsive; horizontal scroll ≤640; fish icons row; score color (5/4 green, 3 amber, ≤2 muted).
- bite-calendar.ts (page, standalone OnPush): usePageLocale; header [pair]=pathPair('biteCalendar'); hero band title «{{ 'bite.title' | transloco }}» + intro «{{ 'bite.intro' | transloco }}». Location source: a native `<select>` of waters (load api.regions? no — load a flat water list: reuse api.waters({perPage:100}) → options of {slug,name,lat,lng}) PLUS a «📍 {{ 'bite.useLocation' | transloco }}» button (geolocation). On select/geolocation → set coords signal → load biteForecast(coords) → render <app-bite-strip [forecast]> (full mode) + an explanation section «{{ 'bite.factorsTitle' | transloco }}» listing the factors (pressure/wind/temp/precip/moon) as static educational text (SEO content). Default on load: pick the first water (or geolocation if granted) so the page shows a forecast immediately for SSR. SEO: applySeo title «Календар кльову — FishMap.ua»/“Bite calendar”, desc, paths pathPair('biteCalendar'), JSON-LD optional (skip — it's a tool page); breadcrumbs FishMap.ua → Календар кльову.
- app.routes.ts: add to BOTH trees `{ path: seg.biteCalendar... }` — the tree() factory takes seg config; add `biteCalendar` to seg ('kalendar-klyovu' uk / 'bite-calendar' en) and a route loading BiteCalendarPage with data.locale. (Follow how blog/fish were added.)
- water-detail.ts: add `bite = signal<BiteForecastDto|null>(null)`; in the water-load success handler also `api.biteForecast(w.lat,w.lng).subscribe(set)`. water-detail.html: under the weather card, `@if (bite()?.available) { <section> h3 «{{ 'bite.widgetTitle' | transloco }}» <app-bite-strip [forecast]="bite()!" [compact]="true" /> <a [routerLink]="locale.link('biteCalendar')" [queryParams]="{lat:w.lat,lng:w.lng}">{{ 'bite.full' | transloco }} →</a> </section> }`. (The page reads lat/lng query params if present to preselect coords — add that to bite-calendar.ts: read route queryParamMap lat/lng, if present use them.)
- header.html + footer.html: add nav link «{{ 'nav.biteCalendar' | transloco }}» → locale.link('biteCalendar').
- i18n uk/en: nav.biteCalendar «Календар кльову»/“Bite calendar”; bite.title «Календар кльову»/“Fishing bite calendar”; bite.intro «Орієнтовний прогноз активності риби на 7 днів»/“7-day estimated fish-activity forecast”; bite.useLocation «Моє місцезнаходження»/“My location”; bite.pickWater «Оберіть водойму»/“Choose a water”; bite.widgetTitle «Прогноз кльову»/“Bite forecast”; bite.full «Повний календар»/“Full calendar”; bite.factorsTitle «Що враховує прогноз»/“What the forecast considers”; bite.factor.pressure/wind/temp/precip/moon (short explanation sentences uk/en); bite.disclaimer «Це орієнтовний прогноз, а не гарантія»/“This is an estimate, not a guarantee”; bite.reason.poor «Слабкий кльов»/“Poor”, fair «Помірний»/“Fair”, good «Добрий»/“Good”, great «Відмінний кльов»/“Great”; moon.new «Молодик»/“New moon», waxingCrescent «Молодий місяць»/“Waxing crescent”, firstQuarter «Перша чверть»/“First quarter”, waxingGibbous «Прибуваючий»/“Waxing gibbous”, full «Повний місяць»/“Full moon”, waningGibbous «Спадаючий»/“Waning gibbous”, lastQuarter «Остання чверть»/“Last quarter”, waningCrescent «Старий місяць»/“Waning crescent”.
- seo.service.ts (API): add the bite-calendar pair to the static pages list: `{ uk: '/kalendar-klyovu', en: '/en/bite-calendar' }`. (Sitemap count will grow by 2.)

**Verify (capture):**
1. `npm run build` clean; public initial bundle ~unchanged (bite-calendar lazy; bite-strip rides water-detail + bite-calendar chunks).
2. SSR: `curl -s http://localhost:4201/kalendar-klyovu | grep -o 'Календар кльову' | head -1` → match; a forecast rendered for the default water (grep a moon name or reason); `/en/bite-calendar` → «Fishing bite calendar». water-detail: `curl -s http://localhost:4201/vodoymy/lvivska-oblast/ozero-navariia | grep -o 'Прогноз кльову' | head -1` → match.
3. Headless Chrome /kalendar-klyovu: 7-day bite forecast renders (7 day cells with fish scores + moon icons), water select present, «Моє місцезнаходження» button; selecting a different water reloads the forecast; zero NG0. EN mirror.
4. water-detail: compact bite strip under weather card + «Повний календар» link with lat/lng query params; clicking it lands on /kalendar-klyovu showing that water's forecast (queryParam preselect). Zero NG0.
5. sitemap: `curl -s http://localhost:3000/sitemap.xml | grep -c '/kalendar-klyovu\|/bite-calendar'` ≥ 2; total count = 86.
6. Mobile 390: /kalendar-klyovu + water-detail bite strip no horizontal overflow.
7. Header/footer nav has the bite-calendar link.

Commit: `feat(web): bite calendar page + water-detail bite strip with moon phase`.

## Task 3: Sweep + review + merge

Restart dev fresh. Root build clean; admin-e2e 8/8; real-browser: /kalendar-klyovu (uk+en, water select + geolocation + 7-day forecast + factor explanations + disclaimer), water-detail bite strip + full-calendar link round-trip, mobile; regression headless zero NG0 (home/catalog/detail/karta/blog/kalendar); sitemap 86. Final holistic reviewer (incl. moon-phase math sanity vs a known date, score determinism, graceful available:false, no secrets, SSR of the default forecast). Fix findings. Merge to main.

## Done criteria

`/api/bite-forecast` returns a deterministic 7-day 0–5 bite score from pressure/wind/temp/precip/moon; a dedicated bilingual SEO page `/kalendar-klyovu` (water select + geolocation + factor explanations + honest disclaimer) and a compact water-detail strip both render it SSR; moon phase computed keylessly; sitemap includes the calendar page; zero spec files; clean builds; public bundle ~unchanged; mobile responsive; admin-e2e 8/8.
