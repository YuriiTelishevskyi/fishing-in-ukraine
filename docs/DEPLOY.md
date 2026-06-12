# Деплой на VPS

Покроковий посібник для власника: від чистого сервера до робочого сайту.

---

## Передумови

| Що потрібно | Деталі |
|---|---|
| VPS | 2 GB RAM і більше (рекомендовано Ubuntu 22.04 LTS) |
| Docker + Compose plugin | `docker compose version` ≥ v2.20 |
| Домен | A-запис вказує на IP вашого VPS |

Встановлення Docker на Ubuntu:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # щоб не писати sudo перед docker
newgrp docker
```

---

## Кроки деплою

### 1. Клонування репозиторію

```bash
git clone https://github.com/<ваш-акаунт>/fishing-in-ukraine.git
cd fishing-in-ukraine
```

### 2. Налаштування змінних середовища

```bash
cp .env.prod.example .env.prod
nano .env.prod   # або будь-який інший редактор
```

Заповніть усі змінні згідно з таблицею нижче.

#### Таблиця змінних `.env.prod`

| Змінна | Приклад значення | Пояснення |
|---|---|---|
| `SITE_DOMAIN` | `fishmap.ua` | Домен **без схеми** (`http://` / `https://`). Caddy використовує це для auto-HTTPS через Let's Encrypt. |
| `SITE_ORIGIN` | `https://fishmap.ua` | Публічний URL з протоколом. Вставляється в canonical-теги, JSON-LD і sitemap. |
| `SITE_BASE_URL` | `https://fishmap.ua` | Те саме, що `SITE_ORIGIN`. Використовується Angular SSR. |
| `NG_ALLOWED_HOSTS` | `fishmap.ua` | Дозволені заголовки `Host` для Angular SSR. Caddy — єдина точка входу, тому достатньо вашого домену. |
| `POSTGRES_USER` | `fishing` | Ім'я користувача PostgreSQL. |
| `POSTGRES_PASSWORD` | *(згенерувати)* | Пароль PostgreSQL. Генерація: `openssl rand -hex 24` |
| `POSTGRES_DB` | `fishing_db` | Назва бази даних. |
| `DATABASE_URL` | `postgresql://fishing:ПАРОЛЬ@postgres:5432/fishing_db?schema=public` | Рядок підключення Prisma. `ПАРОЛЬ` — те саме значення, що й `POSTGRES_PASSWORD`. Хост — `postgres` (назва сервісу в compose). |
| `JWT_SECRET` | *(згенерувати)* | Секрет для підпису JWT. Генерація: `openssl rand -hex 32` |
| `ADMIN_LOGIN` | `admin` | Логін адміністратора. |
| `ADMIN_PASSWORD_HASH` | `$2b$10$...` | Bcrypt-хеш пароля адміна. Генерація — см. нижче. |
| `SEED_DEMO` | `0` | `0` — засіяти лише довідники (регіони, риби, зручності). `1` — додатково демо-водойми (лише для розробки). |

#### Генерація секретів

```bash
# JWT_SECRET
openssl rand -hex 32

# POSTGRES_PASSWORD
openssl rand -hex 24

# ADMIN_PASSWORD_HASH — замініть 'ваш_пароль' на реальний пароль
node -e "const b=require('bcryptjs'); b.hash('ваш_пароль', 10).then(console.log)"
```

> Команду `node -e "..."` виконуйте з кореня репозиторію — там є `bcryptjs` у `node_modules`.

### 3. Запуск стеку

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Перший запуск займе 3–7 хвилин (збірка образів). Наступні запуски — набагато швидше завдяки кешу Docker.

Перевірка запущених контейнерів:

```bash
docker compose -f docker-compose.prod.yml ps
```

Усі сервіси мають бути у стані `Up` (або `healthy`).

### 4. Первинне засівання довідників

Виконайте один раз після першого запуску (або після скидання БД):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  exec api npx prisma db seed
```

При `SEED_DEMO=0` скрипт заповнює лише довідники (регіони, риби, зручності) — без демо-водойм. Це правильна поведінка для продакшену.

### 5. Перевірка роботи сайту

| URL | Що перевірити |
|---|---|
| `https://ваш-домен/` | Головна сторінка — SSR-контент завантажується, без помилок в консолі |
| `https://ваш-домен/admin/login` | Форма входу → авторизуйтесь → перейдіть до адмінки |
| `https://ваш-домен/sitemap.xml` | XML-ситмап з переліком сторінок і hreflang |
| `https://ваш-домен/api/health` | `{"status":"ok"}` — API живий |

> **Важливо:** кука адміна має прапор `Secure`, тому авторизація через **HTTPS** є обов'язковою. Caddy автоматично отримує TLS-сертифікат від Let's Encrypt за умови правильного A-запису.

---

## Google Search Console

1. Відкрийте [Google Search Console](https://search.google.com/search-console/).
2. Додайте ресурс → оберіть тип **URL-prefix** → введіть `https://ваш-домен`.
3. Підтвердіть право власності (рекомендований спосіб — HTML-файл або DNS TXT-запис).
4. У розділі **Sitemaps** надішліть: `https://ваш-домен/sitemap.xml`.

---

## Резервні копії

### База даних (pgdata)

```bash
# Створити дамп
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  exec postgres pg_dump -U fishing fishing_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Відновлення з дампу (зупинити api перед відновленням)
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  exec -T postgres psql -U fishing fishing_db < backup_YYYYMMDD_HHMMSS.sql
```

### Завантажені файли (uploads)

```bash
# Архівування volume uploads
docker run --rm \
  -v fishing-in-ukraine_uploads:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# Відновлення
docker run --rm \
  -v fishing-in-ukraine_uploads:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/uploads_YYYYMMDD_HHMMSS.tar.gz -C /data
```

---

## Оновлення

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Міграції Prisma застосовуються автоматично під час старту контейнера `api` (`npx prisma migrate deploy` в CMD).

---

## Логи

```bash
# Усі сервіси
docker compose -f docker-compose.prod.yml logs -f

# Окремо
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f postgres
```

---

## Відомі особливості

- **Кука адміна `Secure`** — авторизація в адмінці працює лише через HTTPS. Caddy автоматично забезпечує TLS у продакшені.
- **Rate-limit логіна** — 5 спроб за хвилину з однієї IP-адреси. При перевищенні — HTTP 429.
- **Демо-дані вимкнені** — `SEED_DEMO=0` у `.env.prod`. Щоб увімкнути демо-водойми (лише для стейджингу), змініть на `1` і запустіть seed повторно.
- **Angular SSR і заголовок `Host`** — Caddy є єдиною точкою входу; Angular SSR-сервер не перевіряє `Host` напряму (ця перевірка відбувається на рівні Caddy). `NG_ALLOWED_HOSTS` документується для можливого майбутнього використання.
