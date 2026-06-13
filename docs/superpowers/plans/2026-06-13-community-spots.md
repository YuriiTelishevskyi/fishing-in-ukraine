# V2.3 — Plan 7: Community spots (angler-submitted map points)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. No *.spec.ts (project decision — verify via build + curl + headless Chrome).

**Goal:** Anglers add their own fishing points on the map (geolocation + comment + optional photo) without registration; each goes to the admin dashboard for premoderation; approved points show as a separate green "community" layer on /karta.

**Architecture:** New `Spot` entity (PENDING/APPROVED/REJECTED), mirroring the Review premoderation pattern. Public GET (approved) / POST (multipart with photo, honeypot, throttle, bbox validation); admin moderation API + table. Public UI = "add point" mode on /karta with map click-to-place + form panel + green spot layer.

**Tech Stack:** NestJS + Prisma, sharp (photo variants), Leaflet, PrimeNG (admin), @fishing/shared types, Angular 20 signals.

**Spec:** docs/superpowers/specs/2026-06-13-community-spots-design.md. Dev servers: api :3000, web :4201, Postgres :5433, admin admin/admin12345. Patterns to mirror: reviews module (premoderation + honeypot + throttle), media.service (sharp 3-variant write-then-row + StorageService.deleteDir), map-page.ts (Leaflet + pins), admin-reviews-list (moderation table), map-pin.ts (divIcon factory).

---

## Task 1: API — Spot model, public GET/POST, admin moderation, seed

**Files:** apps/api prisma/schema.prisma (+SpotStatus enum, Spot model, migration `add_spots`), prisma/seed.ts (demo spots), packages/shared/src/index.ts (SpotDto, SpotStatus), apps/api/src/spots/ (spots.module, spots.controller [public], admin-spots.controller, spots.service, spots.mapper, dto: create-spot.dto, admin-spots-query.dto, moderate-spot.dto), app.module.ts wiring.

- Schema: `enum SpotStatus { PENDING APPROVED REJECTED }`; `model Spot { id String @id @default(uuid()); lat Float; lng Float; authorName String; authorEmail String?; title String?; comment String; fishNote String?; photoUrl String?; status SpotStatus @default(PENDING); createdAt DateTime @default(now()); @@index([status]) }`. Migrate from apps/api: `npx prisma migrate dev --name add_spots`.
- Shared: `SpotDto { id; lat; lng; authorName; title: string|null; comment; fishNote: string|null; photoThumbUrl: string|null; photoCardUrl: string|null; createdAt: string }`; `type SpotStatus = 'PENDING'|'APPROVED'|'REJECTED'`; `SPOT_STATUSES`. Rebuild shared.
- spots.mapper: `toSpotDto(row)` → public DTO (derive photoThumbUrl/photoCardUrl from photoUrl via `.replace('-full.webp','-thumb.webp'|'-card.webp')`, null when no photo); NEVER include authorEmail/status in public DTO.
- spots.service:
  - `listApproved(): SpotDto[]` — findMany status APPROVED, orderBy createdAt desc, take 2000, map.
  - `create(dto, file?)`: honeypot `dto.website` non-empty → BadRequestException('Spam detected'); bbox guard `lat 44..53 && lng 22..41` else BadRequest('Координати поза межами України'); if file → validate mime in ['image/jpeg','image/png','image/webp'] (else 400), generate `id = randomUUID()`, sharp 3 variants (thumb 320/card 640/full 1600 webp q80) → storage.save(`spots/${id}/${id}-{suffix}.webp`), photoUrl = `/uploads/spots/${id}/${id}-full.webp` (write-then-row: use this id as the Spot id too); create Spot PENDING; return `{ok:true}`.
  - `adminList(q)`, `moderate(id, status)`, `remove(id)` (+ storage.deleteDir(`spots/${id}`)). Mirror reviews.service shapes.
- Public controller `@Controller('spots')`: `GET` (LangQueryDto to accept lang harmlessly) → listApproved; `POST` `@Throttle({default:{limit:5, ttl:3600000}})` + `@UseInterceptors(FileInterceptor('photo', { storage: memoryStorage(), limits:{fileSize:15*1024*1024} }))` + `@UploadedFile() file` + `@Body() CreateSpotDto`. CreateSpotDto: authorName MinLength2 MaxLength40; authorEmail IsOptional IsEmail; title IsOptional MaxLength80; comment MinLength10 MaxLength1000 (@Transform trim); fishNote IsOptional MaxLength120; lat/lng @Type(()=>Number) IsLatitude/IsLongitude or IsNumber+Min/Max; website IsOptional IsString (honeypot, whitelisted). NOTE multipart numbers arrive as strings → use @Transform(({value})=>Number(value)) on lat/lng.
- Admin controller `@Controller('admin/spots')` @UseGuards(AdminGuard): GET (AdminSpotsQueryDto: status default PENDING, page, perPage), PATCH :id (ModerateSpotDto status IsIn APPROVED|REJECTED), DELETE :id.
- Wire StorageService: import MediaModule in SpotsModule (exports StorageService already), reuse it.
- Seed (SEED_DEMO=1, idempotent deleteMany+create): 2 APPROVED spots near Lviv (lat~49.8 lng~24.0, authorName «Тарас»/«Богдан», comments fishing-themed, fishNote, no photo OK) + 1 PENDING («Степан», elsewhere in UA bbox).

**Verify:** builds (shared+api) pass; migration applied; seed → 2 approved + 1 pending. curl: GET /api/spots → 2 items (no email/status fields, no PENDING leak); POST valid (multipart via `-F`) → {ok:true}, invisible publicly, admin GET shows it PENDING; admin PATCH APPROVED → public GET 3; DELETE → 2. Honeypot website filled → 400. bbox lat 60 → 400. 6th POST/hour → 429. Photo upload: POST with `-F photo=@/tmp/test-water.png` → spot has photoUrl, 3 webp files on disk; approve → public DTO has photoThumbUrl/photoCardUrl; DELETE → spots/<id> dir gone. Validation: comment "short" → 400.
Commit: `feat(api): community spots with photo upload, honeypot, bbox guard and moderation`.

## Task 2: Public UI — add-point mode + form + green spot layer on /karta

**Files:** apps/web core/api.service.ts (+spots(), submitSpot(formData)), shared/map-pin.ts (+'community' green variant), features/map/map-page.ts|html|scss (add-point mode, form panel, spots layer), assets/i18n uk/en (+spots.* keys), shared/map-pin styles in styles.scss if needed.

- map-pin.ts: add variant `'community'` → green gradient (#16A34A→#0E7A35) teardrop, same shape.
- api.service: `spots(): Observable<SpotDto[]>` GET /api/spots (lang param ok); `submitSpot(fd: FormData): Observable<{ok:true}>` POST /api/spots (multipart — pass FormData directly, no JSON params).
- map-page.ts: load `spots()` signal; render APPROVED spots as a SEPARATE Leaflet layerGroup (green community pins, NOT in the catalog cluster); popup HTML = photo card img (if photoCardUrl) + title/comment + fishNote + authorName + date (build with escaped text — popup uses innerHTML so ESCAPE author/comment/title via a small escapeHtml helper, OR set popup content via DOM. Since Leaflet popups take HTML strings, escape user text. This is the XSS-critical bit — reviewer will test.).
  - Add-point mode: signal `adding`. Filter bar gets «+ Додати точку» button → toggles adding=true (map cursor crosshair class, instruction toast «Клікніть на карті, де ваша точка»). Map click while adding → place/move a draggable temp green marker, set `pickedCoords` signal. «📍 Моє місцезнаходження» button → navigator.geolocation.getCurrentPosition → setView + place temp marker (handle denial with a message). Once coords set → show form panel (side panel desktop / bottom sheet mobile): name, email (opt), photo file input + preview, comment textarea, fishNote, hidden honeypot `website`, submit + cancel. Submit builds FormData (append all + lat/lng from pickedCoords + photo file if chosen) → submitSpot → on ok: clear temp marker, exit adding, show success note «Дякуємо! Точка з'явиться після перевірки», reload spots() (the new one is PENDING so won't appear — that's expected). Errors 400/429 → inline message.
  - Render user text via Angular interpolation in the FORM/panel; popup strings escaped.
- i18n keys uk/en: spots.add «Додати точку»/“Add a point”, spots.placeHint «Клікніть на карті, де ваша точка»/“Click on the map where your spot is”, spots.myLocation «Моє місцезнаходження»/“My location”, spots.geoDenied «Не вдалося отримати геолокацію»/“Could not get your location”, spots.formTitle «Нова рибна точка»/“New fishing spot”, spots.name «Ваше імʼя»/“Your name”, spots.email «Email (необовʼязково)»/“Email (optional)”, spots.photo «Фото (необовʼязково)»/“Photo (optional)”, spots.comment «Опис місця, що ловилось»/“Describe the spot, what you caught”, spots.fish «Яка риба (необовʼязково)»/“What fish (optional)”, spots.submit «Надіслати»/“Submit”, spots.cancel «Скасувати»/“Cancel”, spots.thanks «Дякуємо! Точка зʼявиться після перевірки.»/“Thanks! Your point will appear after review.”, spots.error «Не вдалося надіслати. Спробуйте пізніше.»/“Could not submit. Try again later.”.
- Responsive: form panel full-width bottom sheet ≤640px; add-point/my-location buttons stack on mobile. Zero horizontal overflow.

**Verify:** build clean, public bundle ≈unchanged. SSR /karta contains «Додати точку». Headless Chrome (:4201): green community pins render for the 2 approved spots (count ≥2 leaflet markers beyond catalog), zero NG0; click «Додати точку» → click map → form panel appears → fill name/comment, submit (no photo) → success note; admin curl shows new PENDING → delete it (cleanup). XSS: an approved spot with comment `<img src=x onerror=alert(1)>` (seed/admin-create one, then remove) → popup shows escaped text, no exec. Mobile 390px: no overflow, bottom sheet form.
Commit: `feat(web): community spots — add-point mode, submission form and green map layer`.

## Task 3: Admin — spots moderation dashboard

**Files:** apps/web features/admin/core/admin-api.service.ts (+AdminSpot interface, adminSpots/moderateSpot/deleteSpot), admin.routes.ts (+spots), shell nav (+«Точки»), features/admin/spots/admin-spots-list.ts|html|scss.

- admin-api: `AdminSpot { id, lat, lng, authorName, authorEmail, title, comment, fishNote, photoUrl, status, createdAt }`; methods adminSpots(q), moderateSpot(id, status), deleteSpot(id).
- admin.routes: child `spots` → AdminSpotsList (lazy).
- shell nav: add «📍 Точки» link (routerLinkActive).
- admin-spots-list (mirror admin-reviews-list + row expansion): toolbar (h2 «Точки», status p-select default PENDING, count); p-table lazy paginator 20: columns Фото (img photoUrl→thumb variant or «—»), Заголовок+коментар (clamped, interpolation), Автор (authorName + authorEmail muted), Координати (`{{lat|number:'1.4-4'}}, {{lng}}`), Дата, Статус p-tag (when filter=Всі), Дії (✓ Схвалити / ✕ Відхилити for PENDING; opposite + 🗑 for others; confirm delete «Видалити точку від «author»?»). Row expansion: Leaflet mini-map (#spotMap-{id}) centered on lat/lng zoom 13 with a community pin — mount on expand via afterNextRender+injector pattern (read element after expansion; guard double-mount). Empty state. All user content interpolation-only.

**Verify:** build clean, admin chunks lazy, public bundle unchanged. Headless CDP cookie: /admin/spots → PENDING «Степан» row visible (author, coords, comment), nav «Точки» active, zero NG0; expand row → leaflet-container mounts with pin; approve via PATCH/UI → public /api/spots count +1; restore via seed. Unauthenticated /admin/spots → login redirect. Mobile 390px: table scrolls, no overflow.
Commit: `feat(web): admin community spots moderation with map preview`.

## Task 4: Sweep + final review + merge

Restart dev servers fresh. Re-run: root build clean; admin-e2e.mjs 8/8; full real-browser e2e (submit spot on /karta → moderate in admin → appears on map → delete); regression headless (home/catalog/detail/karta/blog zero NG0); sitemap unchanged (84 — spots not in sitemap, correct); demo state restored (2 approved + 1 pending). Final holistic reviewer dispatch (incl. adversarial XSS on spot popup + author email never in public DTO). Fix findings. Merge to main.

## Done criteria

Angler can place a point on /karta (click or geolocation), add comment + optional photo, submit (rate-limited, honeypot, bbox-guarded); it is invisible until approved; admin moderates in «Точки» dashboard with a map preview; approved points show as green community pins with popups; author email never leaks publicly; zero spec files; clean builds; public bundle ~unchanged; mobile responsive.
