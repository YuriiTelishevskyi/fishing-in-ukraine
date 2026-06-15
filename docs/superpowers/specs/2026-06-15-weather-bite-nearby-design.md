# Погода, календар кльову, місця поруч — дизайн

**Дата:** 2026-06-15
**Статус:** затверджено (усне погодження)

Три незалежні цикли, що роблять відрив від конкурента (goldfishnet — базовий каталог
без погоди/тиску/прогнозу/«поруч»). Постачальник погоди — **Open-Meteo** (безкоштовний,
без API-ключа, без реєстрації). Жодних платних API.

## Спільна основа (ставиться в Циклі A, переюзається B/C)

`OpenMeteoService` (NestJS, native global `fetch`, без ключа):
- Базовий виклик: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,wind_speed_10m_max,precipitation_sum&timezone=auto&forecast_days=7`.
- **Кеш:** in-memory `Map`, ключ = `lat.toFixed(2)|lng.toFixed(2)` (~1 км), TTL 30 хв. Береже швидкість SSR і ліміти Open-Meteo. (Один api-контейнер у проді → in-memory достатньо.)
- Помилка/таймаут Open-Meteo (fetch з AbortController 4с) → сервіс повертає `null`; ендпоїнти віддають 200 з `{ available: false }`, фронт показує «Погода тимчасово недоступна» (graceful degradation, ніколи не валимо сторінку).
- WMO weather_code → `{ icon, labelKey }` мапа (uk/en підписи в i18n фронту; API повертає code + наш labelKey/нейтральний ключ).

## Цикл A — Погода + тиск (віджет на сторінці водойми)

**API** `GET /api/weather?lat=&lng=` (+lang harmless) → `WeatherDto`:
```
available: boolean
current: { tempC, feelsC, humidity, precipMm, weatherCode, pressureHpa, pressureMmHg,
           pressureTrend: 'rising'|'falling'|'steady', windKmh, windDir (deg), windDirLabel (Пн/Пд/...) }
daily: [{ date, weatherCode, tMax, tMin, sunrise, sunset }]  // 7
updatedAt
```
- `pressureMmHg` = round(hPa × 0.750062). `pressureTrend`: середнє погодинного тиску за останні 3 год vs попередні 3 год; поріг ±0.8 hPa → rising/falling/steady.
- `windDirLabel`: 8-румбова мапа (Пн, ПнСх, Сх, ПдСх, Пд, ПдЗх, Зх, ПнЗх) за градусами.
- Валідація lat/lng (числа в bbox світу; поза → 400). Без throttle (read-only, кешовано), глобальний 1000/хв діє.

**Web:** картка «Погода» на water-detail (під описом/над міні-картою): великий поточний градус + іконка/підпис стану; рядок метрик — тиск (мм рт.ст. великим + hPa дрібним + стрілка тренду ↑/↓/→), вітер (км/год + напрям), вологість %, опади мм; 7-денна смужка (день тижня, іконка, tMax/tMin). Дані через `api.weather(lat,lng)` (SSR + transfer cache — з'являється в початковому HTML, серверний кеш 30 хв). `available:false` → нейтральне повідомлення. i18n для підписів стану/метрик/румбів.

## Цикл B — Календар кльову (окремо)

`BiteForecastService` (переюзає OpenMeteoService) рахує **оцінку кльову 0–5 на день** із прозорої евристики (кожен фактор 0..1, зважена сума → 0..5):
- **Тиск** (вага найбільша): стабільний або повільно падаючий день = добре; різькі стрибки = погано (з daily-похідної погодинного тиску).
- **Вітер:** легкий-помірний добре, штормовий погано (daily wind_speed_10m_max).
- **Температура:** комфортний діапазон добре, екстрим погано (середнє tMax/tMin).
- **Опади:** легка хмарність часто краще за безхмарність/зливу (precipitation_sum + weather_code).
- **Фаза місяця:** рахується астрономічно (синодичний місяць від відомого молодика, без API); нове/повне → невеликий буст.
- Вихід на день: `{ date, score: 0..5, factors: {pressure,wind,temp,moon} (0..1), moonPhase: {name, illumination, icon}, reasonKey/reason }`. Чесно підписано «орієнтовний прогноз».

`GET /api/bite-forecast?lat=&lng=` → `{ available, days: [...7], updatedAt }`.

**Web:**
- **Окрема сторінка** `/kalendar-klyovu` (`/en/bite-calendar`): джерело локації — (а) геолокація, (б) вибір водойми з дропдауну (підставляє її координати). 7-денний прогноз: на кожен день смужка-риби (0–5), причина, фаза місяця. SEO: title/desc/canonical/hreflang + текст-пояснення факторів (контент = трафік). Додати в хедер/футер/sitemap (pair `/kalendar-klyovu`↔`/en/bite-calendar`; per-water bite-сторінок НЕ робимо в sitemap).
- **Віджет** на water-detail: компактна 7-денна смужка кльову (день + 0–5 рибок) із лінком «Повний календар →» на сторінку з підставленими координатами водойми.
- LocaleService SEGMENTS += `biteCalendar {uk:'kalendar-klyovu', en:'bite-calendar'}`.

## Цикл C — Місця поруч

**API** `GET /api/waters/nearby?lat=&lng=&radiusKm=&limit=&lang=` → `(WaterListItemDto & {distanceKm:number})[]`, PUBLISHED у радіусі (default 50 км, limit 30), haversine у застосунку (сотні водойм → миттєво), сортування за зростанням відстані. Валідація координат (bbox), radius 1..500.

**Web:** сторінка `/poruch` (`/en/nearby`): на завантаженні просить геолокацію → `api.watersNearby(...)` → картки водойм найближчі спершу + бейдж «за X км» (water-card розширити опційним `distanceKm`); геолокацію відхилено/немає → повідомлення + лінк на каталог. Кнопка «📍 {{ 'nearby.cta' }}» у хедері та секцією на головній. SEO-сторінка (noindex — контент залежить від геолокації користувача, нема стабільного URL-вмісту → robots noindex, але доступна). LocaleService SEGMENTS += `nearby {uk:'poruch', en:'nearby'}`. Тільки водойми каталогу (народні точки — пізніше).

## Антиспам/надійність

Усі нові ендпоїнти read-only → глобальний throttle 1000/хв достатній. Open-Meteo за AbortController-таймаутом + graceful `available:false`. Координати валідуються (bbox світу) → 400 на сміття. Жодних секретів/ключів.

## Порядок і обсяг

A (погода, ставить OpenMeteoService+кеш) → B (календар, переюзає) → C (поруч, незалежний).
Кожен цикл — окремий план (3 задачі: API → public UI → (де є) admin/інтеграція) + sweep+review+merge, як усталено. Двомовність, мобільна респонсивність, нуль NG0 — в кожному.
