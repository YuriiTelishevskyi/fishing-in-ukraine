# Admin WOW UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full UI/UX overhaul of the Angular 20 admin area — replace topbar-only layout with a fixed sidebar shell, apply panel-based page layout to all list/form pages, add proper mobile responsiveness (≤390px no horizontal overflow), and achieve WOW visual quality.

**Architecture:** Replace the single `admin-shell` topbar with a sidebar layout using Angular signals for mobile toggle state. Each list page gets a `.panel` wrapper containing the table. Each form page gets section panels with a sticky action bar that becomes a fixed bottom bar on mobile. All SCSS is scoped BEM within each component's `.scss` file; no new shared files needed.

**Tech Stack:** Angular 20, PrimeNG 20.4.0 (Aura theme, free), SCSS BEM, CSS custom properties from `styles.scss`, Leaflet (already in water form), Puppeteer e2e script.

---

## Critical Constraints (read before every task)

1. **E2E script selectors that MUST NOT change:**
   - Login: `input[name="login"]`, `input[type="password"]`, `button[type="submit"]`
   - Shell logout: button inside `.ash__bar` with text `Вийти` — keep `.ash__bar` class OR update the script selector query
   - Water list: `button` with text `Нова водойма`; table rows with water name
   - Water form: `input[formcontrolname="name"]`, `textarea[formcontrolname="description"]`, `p-select[formcontrolname="regionId"]`, `p-select[formcontrolname="waterType"]`, `.leaflet-container`, `input[formcontrolname="lat"]`, `input[formcontrolname="lng"]`, `p-multiselect[formcontrolname="fishIds"]`, `p-button[label="Зберегти"]`, `p-button[label="Опублікувати"]`, `.awf__slug`, `.awf__thumb-img`
   - Delete: row with water name → `p-button[icon*="trash"]`; confirm dialog button text `Видалити`
   - **The e2e script looks for `.ash__bar button` for Вийти** — we MUST keep `.ash__bar` on some container element, or update the selector in the HTML (the script searches `document.querySelectorAll('.ash__bar button')`).

2. **Strategy for `.ash__bar`:** The new shell will have a sidebar (`.ash__sidebar`) but we KEEP a hidden `.ash__bar` element OR put the logout button somewhere the script can find it. **Simplest: keep `.ash__bar` as a class on the sidebar element**, the script searches `.ash__bar button` — any button inside `.ash__bar` class works.

3. Run `node scripts/admin-e2e.mjs` after Task 7 and verify 7/7 or 8/8 PASS.

---

## File Map

| File | Change |
|------|--------|
| `apps/web/src/app/features/admin/shell/admin-shell.html` | Full rewrite — sidebar layout |
| `apps/web/src/app/features/admin/shell/admin-shell.scss` | Full rewrite — sidebar + mobile overlay |
| `apps/web/src/app/features/admin/shell/admin-shell.ts` | Add `sidebarOpen` signal + `toggleSidebar()` / `closeSidebar()` |
| `apps/web/src/app/features/admin/login/admin-login.scss` | Polish: card max-width 380, mobile padding |
| `apps/web/src/app/features/admin/waters/admin-waters-list.html` | Add page header row, wrap table in `.panel--scroll` |
| `apps/web/src/app/features/admin/waters/admin-waters-list.scss` | Panel pattern, header row, mobile stacking |
| `apps/web/src/app/features/admin/articles/admin-articles-list.html` | Same panel pattern as waters list |
| `apps/web/src/app/features/admin/articles/admin-articles-list.scss` | Same as waters list scss |
| `apps/web/src/app/features/admin/reviews/admin-reviews-list.html` | Same panel pattern |
| `apps/web/src/app/features/admin/reviews/admin-reviews-list.scss` | Same |
| `apps/web/src/app/features/admin/waters/admin-water-form.html` | Sticky action bar, section panel headers |
| `apps/web/src/app/features/admin/waters/admin-water-form.scss` | Sticky bar, fixed bottom bar mobile, section heads |
| `apps/web/src/app/features/admin/articles/admin-article-form.html` | Same sticky bar pattern |
| `apps/web/src/app/features/admin/articles/admin-article-form.scss` | Same |

---

## Task 1: Shell — TypeScript signal for sidebar toggle

**Files:**
- Modify: `apps/web/src/app/features/admin/shell/admin-shell.ts`

- [ ] **Step 1: Update admin-shell.ts to add sidebar signal**

Replace the entire file with:

```typescript
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminApiService } from '../core/admin-api.service';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShell {
  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);

  readonly sidebarOpen = signal(false);

  toggleSidebar() {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  logout() {
    this.api.logout().subscribe(() => this.router.navigate(['/admin/login']));
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles (no errors expected)**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && npx tsc -p apps/web/tsconfig.app.json --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated warnings).

---

## Task 2: Shell — HTML sidebar layout

**Files:**
- Modify: `apps/web/src/app/features/admin/shell/admin-shell.html`

- [ ] **Step 1: Replace admin-shell.html with sidebar layout**

Replace the entire file content with:

```html
<!-- Sidebar overlay backdrop (mobile) -->
@if (sidebarOpen()) {
  <div class="ash__backdrop" (click)="closeSidebar()"></div>
}

<div class="ash" [class.ash--sidebar-open]="sidebarOpen()">
  <!-- ── Sidebar ── -->
  <aside class="ash__sidebar ash__bar">
    <div class="ash__sidebar-header">
      <a routerLink="/admin/waters" class="ash__logo" (click)="closeSidebar()">
        🎣 <span class="ash__logo-text">FishMap<em>.ua</em></span>
      </a>
      <span class="ash__logo-label">Адмінка</span>
    </div>

    <nav class="ash__nav">
      <a
        routerLink="/admin/waters"
        routerLinkActive="ash__nav-link--active"
        class="ash__nav-link"
        (click)="closeSidebar()"
      >
        <span class="ash__nav-icon">💧</span>
        <span>Водойми</span>
      </a>
      <a
        routerLink="/admin/articles"
        routerLinkActive="ash__nav-link--active"
        class="ash__nav-link"
        (click)="closeSidebar()"
      >
        <span class="ash__nav-icon">📝</span>
        <span>Статті</span>
      </a>
      <a
        routerLink="/admin/reviews"
        routerLinkActive="ash__nav-link--active"
        class="ash__nav-link"
        (click)="closeSidebar()"
      >
        <span class="ash__nav-icon">⭐</span>
        <span>Відгуки</span>
      </a>
    </nav>

    <div class="ash__sidebar-footer">
      <a href="/" target="_blank" class="ash__footer-link">
        <span>На сайт</span> <span class="ash__footer-arrow">↗</span>
      </a>
      <button type="button" class="ash__logout-btn" (click)="logout()">Вийти</button>
    </div>
  </aside>

  <!-- ── Main content ── -->
  <div class="ash__body">
    <!-- Mobile top bar -->
    <header class="ash__topbar">
      <button
        type="button"
        class="ash__burger"
        (click)="toggleSidebar()"
        aria-label="Меню"
      >☰</button>
      <a routerLink="/admin/waters" class="ash__topbar-logo">🎣 FishMap<em>.ua</em></a>
    </header>

    <main class="ash__main">
      <router-outlet />
    </main>
  </div>
</div>
```

- [ ] **Step 2: Sanity-check template compiles (run build check)**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && npx tsc -p apps/web/tsconfig.app.json --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

## Task 3: Shell — SCSS sidebar styles

**Files:**
- Modify: `apps/web/src/app/features/admin/shell/admin-shell.scss`

- [ ] **Step 1: Replace admin-shell.scss with sidebar styles**

Replace the entire file with:

```scss
$sidebar-w: 240px;
$mobile-bp: 900px;

.ash {
  min-height: 100vh;
  background: var(--surface);

  // ── Sidebar ──────────────────────────────────────────────────────────────
  &__sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: $sidebar-w;
    height: 100vh;
    background: var(--hero-from);
    display: flex;
    flex-direction: column;
    z-index: 200;
    overflow-y: auto;
    transition: transform 0.25s ease;
  }

  &__sidebar-header {
    padding: 24px 20px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  &__logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-head);
    font-size: 1.1rem;
    font-weight: 800;
    color: #fff;
    text-decoration: none;
    line-height: 1;

    em {
      color: var(--accent);
      font-style: normal;
    }
  }

  &__logo-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.45);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 4px;
  }

  // ── Nav ──────────────────────────────────────────────────────────────────
  &__nav {
    flex: 1;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.7);
    font: 500 0.92rem var(--font-body);
    text-decoration: none;
    transition: background 0.15s, color 0.15s;
    position: relative;

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    &--active {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      font-weight: 700;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 60%;
        background: var(--accent);
        border-radius: 0 3px 3px 0;
      }
    }
  }

  &__nav-icon {
    font-size: 1.1rem;
    line-height: 1;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  // ── Sidebar footer ────────────────────────────────────────────────────────
  &__sidebar-footer {
    padding: 16px 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__footer-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.6);
    font: 500 0.88rem var(--font-body);
    text-decoration: none;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }
  }

  &__footer-arrow {
    font-size: 0.9rem;
  }

  &__logout-btn {
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.8);
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    font: 600 0.88rem var(--font-body);
    text-align: left;
    transition: background 0.15s, color 0.15s;
    width: 100%;

    &:hover {
      background: rgba(255, 255, 255, 0.14);
      color: #fff;
    }
  }

  // ── Main body ────────────────────────────────────────────────────────────
  &__body {
    margin-left: $sidebar-w;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    transition: margin-left 0.25s ease;
  }

  &__main {
    padding: 28px 32px 60px;
    max-width: 1280px;
    width: 100%;
    flex: 1;
  }

  // ── Mobile top bar (hidden on desktop) ───────────────────────────────────
  &__topbar {
    display: none;
  }

  // ── Mobile backdrop ───────────────────────────────────────────────────────
  &__backdrop {
    display: none;
  }

  // ── Mobile (<900px) ───────────────────────────────────────────────────────
  @media (max-width: #{$mobile-bp}) {
    &__sidebar {
      transform: translateX(-100%);
    }

    &--sidebar-open &__sidebar {
      transform: translateX(0);
    }

    &__body {
      margin-left: 0;
    }

    &__topbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--hero-from);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    &__burger {
      background: none;
      border: none;
      color: #fff;
      font-size: 1.4rem;
      cursor: pointer;
      padding: 4px 6px;
      line-height: 1;
    }

    &__topbar-logo {
      font-family: var(--font-head);
      font-size: 1rem;
      font-weight: 800;
      color: #fff;
      text-decoration: none;

      em {
        color: var(--accent);
        font-style: normal;
      }
    }

    &__main {
      padding: 16px 16px 80px;
    }

    &__backdrop {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 190;
      animation: fade-in 0.2s ease;
    }
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

- [ ] **Step 2: Verify build still compiles**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && npx tsc -p apps/web/tsconfig.app.json --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit shell changes**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && git add apps/web/src/app/features/admin/shell/ && git commit -m "feat(admin): sidebar shell layout with mobile toggle"
```

---

## Task 4: Waters list — panel layout + page header

**Files:**
- Modify: `apps/web/src/app/features/admin/waters/admin-waters-list.html`
- Modify: `apps/web/src/app/features/admin/waters/admin-waters-list.scss`

- [ ] **Step 1: Replace admin-waters-list.html**

Replace the entire file with:

```html
<div class="awl">
  <!-- Page header row -->
  <div class="awl__page-header">
    <div class="awl__page-title-group">
      <h1 class="awl__page-title">Водойми</h1>
      <span class="awl__page-subtitle">{{ total() }} записів</span>
    </div>
    <p-button
      label="+ Нова водойма"
      [routerLink]="['/admin/waters/new']"
      severity="primary"
    />
  </div>

  <!-- Filters panel -->
  <div class="awl__panel awl__filters">
    <p-select
      [(ngModel)]="status"
      [options]="statusOptions"
      optionLabel="label"
      optionValue="value"
      (onChange)="onStatusChange()"
      placeholder="Статус"
    />

    <input
      pInputText
      type="text"
      [(ngModel)]="search"
      placeholder="Пошук…"
      class="awl__search"
      (keyup.enter)="onSearchEnterOrBlur()"
      (blur)="onSearchEnterOrBlur()"
    />
  </div>

  <!-- Table panel -->
  <div class="awl__panel awl__panel--flush awl__panel--scroll">
    <p-table
      [value]="rows()"
      [lazy]="true"
      [paginator]="true"
      [rows]="20"
      [totalRecords]="total()"
      [loading]="loading()"
      (onLazyLoad)="onLazy($event)"
      dataKey="id"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Назва</th>
          <th>Область</th>
          <th>Статус</th>
          <th>Перевірена</th>
          <th>Фото</th>
          <th>Оновлено</th>
          <th>Дії</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-w>
        <tr>
          <td>
            <span class="awl__name">{{ w.name }}</span>
            <br />
            <small class="awl__slug">{{ w.slug }}</small>
          </td>
          <td>{{ w.regionName }}</td>
          <td>
            <p-tag
              [severity]="statusSeverity(w.status)"
              [value]="statusLabel(w.status)"
            />
          </td>
          <td>{{ w.verified ? '✓' : '—' }}</td>
          <td>{{ w.media.length }}</td>
          <td>{{ w.updatedAt | date:'dd.MM.yyyy HH:mm' }}</td>
          <td class="awl__actions">
            <p-button
              icon="pi pi-pencil"
              severity="secondary"
              [text]="true"
              [routerLink]="['/admin/waters', w.id]"
              pTooltip="Редагувати"
            />
            <p-button
              icon="pi pi-trash"
              severity="danger"
              [text]="true"
              (onClick)="confirmDelete(w)"
              pTooltip="Видалити"
            />
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="7" class="awl__empty">Нічого не знайдено</td>
        </tr>
      </ng-template>
    </p-table>
  </div>
</div>

<p-confirmdialog />
```

- [ ] **Step 2: Replace admin-waters-list.scss**

Replace the entire file with:

```scss
.awl {
  // ── Page header row ───────────────────────────────────────────────────────
  &__page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  &__page-title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__page-title {
    font-family: var(--font-head);
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--ink);
    margin: 0;
  }

  &__page-subtitle {
    font-size: 0.8rem;
    color: var(--muted);
  }

  // ── Panel card ────────────────────────────────────────────────────────────
  &__panel {
    background: var(--card);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 14px 16px;
    margin-bottom: 20px;

    &--flush {
      padding: 0;
      overflow: hidden;
    }

    &--scroll {
      overflow-x: auto;

      // Give the table inside a minimum width so it scrolls rather than wraps
      :host ::ng-deep p-table table,
      ::ng-deep p-table table {
        min-width: 640px;
      }
    }
  }

  // ── Filters row ───────────────────────────────────────────────────────────
  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  &__search {
    width: 220px;

    @media (max-width: 600px) {
      width: 100%;
    }
  }

  // ── Table cells ───────────────────────────────────────────────────────────
  &__name {
    font-weight: 600;
    color: var(--ink);
  }

  &__slug {
    color: var(--muted);
    font-size: 0.78rem;
  }

  &__actions {
    display: flex;
    gap: 4px;
    white-space: nowrap;
    justify-content: flex-end;
  }

  &__empty {
    text-align: center;
    padding: 32px 16px;
    color: var(--muted);
  }

  // ── Mobile stacking ───────────────────────────────────────────────────────
  @media (max-width: 600px) {
    &__page-header {
      flex-direction: column;
      align-items: flex-start;
    }

    &__filters {
      flex-direction: column;
      align-items: stretch;
    }
  }
}

// PrimeNG table row hover & cell padding overrides (scoped via global deep)
:host ::ng-deep {
  .p-datatable .p-datatable-tbody > tr:hover > td {
    background: #f4f9fa;
  }

  .p-datatable .p-datatable-tbody > tr > td {
    padding-top: 12px;
    padding-bottom: 12px;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && npx tsc -p apps/web/tsconfig.app.json --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit waters list changes**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && git add apps/web/src/app/features/admin/waters/admin-waters-list.html apps/web/src/app/features/admin/waters/admin-waters-list.scss && git commit -m "feat(admin): waters list — panel layout + page header"
```

---

## Task 5: Articles list — panel layout

**Files:**
- Modify: `apps/web/src/app/features/admin/articles/admin-articles-list.html`
- Modify: `apps/web/src/app/features/admin/articles/admin-articles-list.scss`

- [ ] **Step 1: Replace admin-articles-list.html**

Replace the entire file with:

```html
<div class="aal">
  <!-- Page header row -->
  <div class="aal__page-header">
    <div class="aal__page-title-group">
      <h1 class="aal__page-title">Статті</h1>
      <span class="aal__page-subtitle">{{ total() }} записів</span>
    </div>
    <p-button
      label="+ Нова стаття"
      [routerLink]="['/admin/articles/new']"
      severity="primary"
    />
  </div>

  <!-- Filters panel -->
  <div class="aal__panel aal__filters">
    <p-select
      [(ngModel)]="status"
      [options]="statusOptions"
      optionLabel="label"
      optionValue="value"
      (onChange)="onStatusChange()"
      placeholder="Статус"
    />

    <input
      pInputText
      type="text"
      [(ngModel)]="search"
      placeholder="Пошук…"
      class="aal__search"
      (keyup.enter)="onSearchEnterOrBlur()"
      (blur)="onSearchEnterOrBlur()"
    />
  </div>

  <!-- Table panel -->
  <div class="aal__panel aal__panel--flush aal__panel--scroll">
    <p-table
      [value]="rows()"
      [lazy]="true"
      [paginator]="true"
      [rows]="20"
      [totalRecords]="total()"
      [loading]="loading()"
      (onLazyLoad)="onLazy($event)"
      dataKey="id"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Заголовок</th>
          <th>Статус</th>
          <th>Опубліковано</th>
          <th>Оновлено</th>
          <th>Дії</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-a>
        <tr>
          <td>
            <span class="aal__name">{{ a.title }}</span>
            <br />
            <small class="aal__slug">{{ a.slug }}</small>
          </td>
          <td>
            <p-tag
              [severity]="statusSeverity(a.status)"
              [value]="statusLabel(a.status)"
            />
          </td>
          <td>{{ a.publishedAt ? (a.publishedAt | date:'dd.MM.yyyy') : '—' }}</td>
          <td>{{ a.updatedAt | date:'dd.MM.yyyy HH:mm' }}</td>
          <td class="aal__actions">
            <p-button
              icon="pi pi-pencil"
              severity="secondary"
              [text]="true"
              [routerLink]="['/admin/articles', a.id]"
              pTooltip="Редагувати"
            />
            <p-button
              icon="pi pi-trash"
              severity="danger"
              [text]="true"
              (onClick)="confirmDelete(a)"
              pTooltip="Видалити"
            />
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="5" class="aal__empty">Нічого не знайдено</td>
        </tr>
      </ng-template>
    </p-table>
  </div>
</div>

<p-confirmdialog />
```

- [ ] **Step 2: Replace admin-articles-list.scss**

Replace the entire file with:

```scss
.aal {
  // ── Page header row ───────────────────────────────────────────────────────
  &__page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  &__page-title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__page-title {
    font-family: var(--font-head);
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--ink);
    margin: 0;
  }

  &__page-subtitle {
    font-size: 0.8rem;
    color: var(--muted);
  }

  // ── Panel card ────────────────────────────────────────────────────────────
  &__panel {
    background: var(--card);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 14px 16px;
    margin-bottom: 20px;

    &--flush {
      padding: 0;
      overflow: hidden;
    }

    &--scroll {
      overflow-x: auto;

      :host ::ng-deep p-table table,
      ::ng-deep p-table table {
        min-width: 640px;
      }
    }
  }

  // ── Filters row ───────────────────────────────────────────────────────────
  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  &__search {
    width: 220px;

    @media (max-width: 600px) {
      width: 100%;
    }
  }

  // ── Table cells ───────────────────────────────────────────────────────────
  &__name {
    font-weight: 600;
    color: var(--ink);
  }

  &__slug {
    color: var(--muted);
    font-size: 0.78rem;
  }

  &__actions {
    display: flex;
    gap: 4px;
    white-space: nowrap;
    justify-content: flex-end;
  }

  &__empty {
    text-align: center;
    padding: 32px 16px;
    color: var(--muted);
  }

  // ── Mobile stacking ───────────────────────────────────────────────────────
  @media (max-width: 600px) {
    &__page-header {
      flex-direction: column;
      align-items: flex-start;
    }

    &__filters {
      flex-direction: column;
      align-items: stretch;
    }
  }
}

:host ::ng-deep {
  .p-datatable .p-datatable-tbody > tr:hover > td {
    background: #f4f9fa;
  }

  .p-datatable .p-datatable-tbody > tr > td {
    padding-top: 12px;
    padding-bottom: 12px;
  }
}
```

- [ ] **Step 3: Commit articles list**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && git add apps/web/src/app/features/admin/articles/admin-articles-list.html apps/web/src/app/features/admin/articles/admin-articles-list.scss && git commit -m "feat(admin): articles list — panel layout + page header"
```

---

## Task 6: Reviews list — panel layout

**Files:**
- Modify: `apps/web/src/app/features/admin/reviews/admin-reviews-list.html`
- Modify: `apps/web/src/app/features/admin/reviews/admin-reviews-list.scss`

- [ ] **Step 1: Replace admin-reviews-list.html**

Replace the entire file with:

```html
<div class="arl">
  <!-- Page header row -->
  <div class="arl__page-header">
    <div class="arl__page-title-group">
      <h1 class="arl__page-title">Відгуки</h1>
      <span class="arl__page-subtitle">{{ total() }} записів</span>
    </div>
  </div>

  <!-- Filters panel -->
  <div class="arl__panel arl__filters">
    <p-select
      [(ngModel)]="status"
      [options]="statusOptions"
      optionLabel="label"
      optionValue="value"
      (onChange)="onStatusChange()"
      placeholder="Статус"
    />
  </div>

  <!-- Table panel -->
  <div class="arl__panel arl__panel--flush arl__panel--scroll">
    <p-table
      [value]="rows()"
      [lazy]="true"
      [paginator]="true"
      [rows]="20"
      [totalRecords]="total()"
      [loading]="loading()"
      (onLazyLoad)="onLazy($event)"
      dataKey="id"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Водойма</th>
          @if (showStatusColumn()) {
            <th>Статус</th>
          }
          <th>Автор</th>
          <th>Оцінка</th>
          <th>Текст</th>
          <th>Дата</th>
          <th>Дії</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-r>
        <tr>
          <td>
            <span class="arl__water-name">{{ r.water.name }}</span>
            <br />
            <small class="arl__water-slug">{{ r.water.slug }}</small>
          </td>
          @if (showStatusColumn()) {
            <td>
              <p-tag
                [severity]="statusSeverity(r.status)"
                [value]="statusLabel(r.status)"
              />
            </td>
          }
          <td>{{ r.authorName }}</td>
          <td class="arl__rating">{{ stars(r.rating) }}</td>
          <td>
            <div class="arl__text" [title]="r.text">{{ r.text }}</div>
          </td>
          <td>{{ r.createdAt | date:'dd.MM.yyyy HH:mm' }}</td>
          <td class="arl__actions">
            @if (r.status === 'PENDING') {
              <p-button
                label="✓ Схвалити"
                severity="success"
                [text]="true"
                (onClick)="approve(r)"
              />
              <p-button
                label="✕ Відхилити"
                severity="warn"
                [text]="true"
                (onClick)="reject(r)"
              />
            } @else if (r.status === 'REJECTED') {
              <p-button
                label="✓ Схвалити"
                severity="success"
                [text]="true"
                (onClick)="approve(r)"
              />
              <p-button
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                (onClick)="confirmDelete(r)"
              />
            } @else if (r.status === 'APPROVED') {
              <p-button
                label="✕ Відхилити"
                severity="warn"
                [text]="true"
                (onClick)="reject(r)"
              />
              <p-button
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                (onClick)="confirmDelete(r)"
              />
            }
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="emptymessage">
        <tr>
          <td [attr.colspan]="showStatusColumn() ? 7 : 6" class="arl__empty">Немає відгуків у цьому фільтрі</td>
        </tr>
      </ng-template>
    </p-table>
  </div>
</div>

<p-confirmdialog />
```

- [ ] **Step 2: Replace admin-reviews-list.scss**

Replace the entire file with:

```scss
.arl {
  // ── Page header row ───────────────────────────────────────────────────────
  &__page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  &__page-title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__page-title {
    font-family: var(--font-head);
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--ink);
    margin: 0;
  }

  &__page-subtitle {
    font-size: 0.8rem;
    color: var(--muted);
  }

  // ── Panel card ────────────────────────────────────────────────────────────
  &__panel {
    background: var(--card);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 14px 16px;
    margin-bottom: 20px;

    &--flush {
      padding: 0;
      overflow: hidden;
    }

    &--scroll {
      overflow-x: auto;

      :host ::ng-deep p-table table,
      ::ng-deep p-table table {
        min-width: 680px;
      }
    }
  }

  // ── Filters row ───────────────────────────────────────────────────────────
  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  // ── Table cells ───────────────────────────────────────────────────────────
  &__water-name {
    font-weight: 600;
    color: var(--ink);
  }

  &__water-slug {
    color: var(--muted);
    font-size: 0.78rem;
  }

  &__rating {
    color: #f59e0b;
    font-size: 1rem;
    white-space: nowrap;
  }

  &__text {
    max-width: 280px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: pre-line;
    font-size: 0.9rem;
  }

  &__actions {
    display: flex;
    gap: 4px;
    white-space: nowrap;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  &__empty {
    text-align: center;
    padding: 32px 16px;
    color: var(--muted);
  }

  // ── Mobile stacking ───────────────────────────────────────────────────────
  @media (max-width: 600px) {
    &__page-header {
      flex-direction: column;
      align-items: flex-start;
    }

    &__filters {
      flex-direction: column;
      align-items: stretch;
    }
  }
}

:host ::ng-deep {
  .p-datatable .p-datatable-tbody > tr:hover > td {
    background: #f4f9fa;
  }

  .p-datatable .p-datatable-tbody > tr > td {
    padding-top: 12px;
    padding-bottom: 12px;
  }
}
```

- [ ] **Step 3: Commit reviews list**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && git add apps/web/src/app/features/admin/reviews/admin-reviews-list.html apps/web/src/app/features/admin/reviews/admin-reviews-list.scss && git commit -m "feat(admin): reviews list — panel layout + page header"
```

---

## Task 7: Water form — sticky action bar + section panels polish

**Files:**
- Modify: `apps/web/src/app/features/admin/waters/admin-water-form.html`
- Modify: `apps/web/src/app/features/admin/waters/admin-water-form.scss`

The HTML structure stays the same as now (keeping all formControlName attributes, `.awf__slug`, `.awf__thumb-img`, etc. untouched). We only change the **header** structure to support a sticky action bar.

- [ ] **Step 1: Update admin-water-form.html header + media section header**

Replace the `<!-- Header row -->` block at the top (lines 5-47 in the original) with:

```html
<p-toast />

<div class="awf">
  <!-- Sticky action bar -->
  <div class="awf__action-bar">
    <div class="awf__action-bar-left">
      <a routerLink="/admin/waters" class="awf__back">← До списку</a>
      <div class="awf__title-block">
        @if (id && water()) {
          <h1 class="awf__title">{{ water()!.name }}</h1>
          <p-tag
            [severity]="statusSeverity(water()!.status)"
            [value]="statusLabel(water()!.status)"
          />
          <small class="awf__slug">{{ water()!.slug }}</small>
        } @else {
          <h1 class="awf__title">Нова водойма</h1>
        }
      </div>
    </div>
    <div class="awf__action-bar-btns">
      @if (id) {
        @if (currentStatus === 'PUBLISHED') {
          <p-button
            label="У чернетку"
            severity="secondary"
            [loading]="statusUpdating()"
            (onClick)="toggleStatus()"
          />
        } @else {
          <p-button
            label="Опублікувати"
            severity="success"
            [loading]="statusUpdating()"
            (onClick)="toggleStatus()"
          />
        }
      }
      <p-button
        label="Зберегти"
        severity="primary"
        [loading]="saving()"
        (onClick)="submit()"
      />
    </div>
  </div>
```

And update the media section header (`<!-- Media manager (edit mode only) -->`) to add an upload button next to the section title — replace just that `<div class="awf__card">` block (the one that starts at `@if (id) {`):

```html
    @if (id) {
      <div class="awf__card">
        <div class="awf__section-header">
          <h3 class="awf__section-title">Фото</h3>
          <p-button
            label="Завантажити фото"
            icon="pi pi-upload"
            severity="secondary"
            [loading]="uploading()"
            [disabled]="uploading()"
            (onClick)="triggerFileInput()"
          />
        </div>

        <input
          #fileInput
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="awf__file-hidden"
          (change)="onFile($event)"
        />

        @if (media().length > 0) {
          <div class="awf__media-grid">
            @for (m of media(); track m.id; let i = $index) {
              <div class="awf__thumb-card">
                @if (i === 0) {
                  <span class="awf__thumb-badge">Обкладинка</span>
                }
                <img
                  [src]="m.urlThumb"
                  [alt]="m.alt ?? ''"
                  loading="lazy"
                  class="awf__thumb-img"
                />
                <div class="awf__thumb-controls">
                  <button
                    type="button"
                    class="awf__thumb-btn"
                    title="Перемістити ліворуч"
                    [disabled]="i === 0"
                    (click)="moveMedia(i, -1)"
                  >←</button>
                  <button
                    type="button"
                    class="awf__thumb-btn"
                    title="Перемістити праворуч"
                    [disabled]="i === media().length - 1"
                    (click)="moveMedia(i, 1)"
                  >→</button>
                  <button
                    type="button"
                    class="awf__thumb-btn awf__thumb-btn--danger"
                    title="Видалити"
                    (click)="confirmDeleteMedia(m)"
                  >🗑</button>
                </div>
              </div>
            }
          </div>
        } @else {
          <p class="awf__media-empty">Фото ще не додані</p>
        }
      </div>
    }
```

- [ ] **Step 2: Replace admin-water-form.scss**

Replace the entire file with:

```scss
.awf {
  max-width: 900px;

  // ── Action bar ────────────────────────────────────────────────────────────
  &__action-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--surface);
    padding: 12px 0;
    margin-left: -4px;
    margin-right: -4px;
    padding-left: 4px;
    padding-right: 4px;
  }

  &__action-bar-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    flex: 1;
    min-width: 0;
  }

  &__action-bar-btns {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
  }

  &__back {
    color: var(--accent);
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover {
      text-decoration: underline;
    }
  }

  &__title-block {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    min-width: 0;
  }

  &__title {
    font-family: var(--font-head);
    font-size: 1.3rem;
    font-weight: 800;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__slug {
    color: var(--muted);
    font-size: 0.8rem;
  }

  // ── Section cards ────────────────────────────────────────────────────────
  &__card {
    background: var(--card);
    border-radius: var(--radius);
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: var(--shadow);
  }

  &__section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__section-title {
    font-family: var(--font-head);
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--muted);
    margin: 0 0 18px 0;
  }

  // When section-title is inside section-header, remove its bottom margin
  &__section-header &__section-title {
    margin-bottom: 0;
  }

  // ── Grid ─────────────────────────────────────────────────────────────────
  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;

    &--mt {
      margin-top: 16px;
    }

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  }

  // ── Fields ───────────────────────────────────────────────────────────────
  &__field {
    display: flex;
    flex-direction: column;
    gap: 6px;

    &--full {
      grid-column: 1 / -1;
    }

    &--toggle {
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }
  }

  &__label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__req {
    color: #ef4444;
    text-transform: none;
  }

  &__input {
    width: 100%;
  }

  &__error {
    font-size: 0.78rem;
    color: #ef4444;
  }

  // ── Map ──────────────────────────────────────────────────────────────────
  &__map {
    height: 320px;
    border-radius: 10px;
    overflow: hidden;
    margin-top: 16px;
    border: 1px solid var(--line);

    @media (max-width: 600px) {
      height: 260px;
    }
  }

  &__map-hint {
    display: block;
    margin-top: 6px;
    font-size: 0.78rem;
    color: var(--muted);
  }

  // ── Details (collapsible sections) ───────────────────────────────────────
  &__details {
    cursor: default;

    &-summary {
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--muted);
      list-style: none;
      user-select: none;
      padding: 0 0 4px 0;
      margin-bottom: 0;
      display: flex;
      align-items: center;
      gap: 6px;

      &::before {
        content: '▶';
        font-size: 0.65em;
        transition: transform 0.2s;
        display: inline-block;
      }
    }
  }

  details[open] &__details-summary::before {
    transform: rotate(90deg);
  }

  // ── Media manager ─────────────────────────────────────────────────────────
  &__file-hidden {
    display: none;
  }

  &__media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
    margin-top: 16px;
  }

  &__thumb-card {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    background: #f3f4f6;
    display: flex;
    flex-direction: column;
  }

  &__thumb-badge {
    position: absolute;
    top: 6px;
    left: 6px;
    background: var(--accent);
    color: #fff;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 999px;
    z-index: 1;
    pointer-events: none;
  }

  &__thumb-img {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    display: block;
  }

  &__thumb-controls {
    display: flex;
    justify-content: center;
    gap: 4px;
    padding: 6px 4px;
    background: #fff;
  }

  &__thumb-btn {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 0.82rem;
    cursor: pointer;
    transition: background 0.15s;
    line-height: 1.4;

    &:hover:not(:disabled) {
      background: #e5e7eb;
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    &--danger {
      border-color: #fca5a5;
      background: #fff1f1;

      &:hover:not(:disabled) {
        background: #fee2e2;
      }
    }
  }

  &__media-empty {
    margin-top: 12px;
    font-size: 0.9rem;
    color: var(--muted);
  }

  // ── Mobile action bar → fixed bottom bar ──────────────────────────────────
  @media (max-width: 700px) {
    &__action-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      top: auto;
      z-index: 300;
      background: var(--card);
      border-top: 1px solid var(--line);
      padding: 12px 16px;
      padding-bottom: calc(12px + env(safe-area-inset-bottom));
      margin: 0;
      box-shadow: 0 -2px 12px rgba(11, 27, 34, 0.1);
      flex-direction: column;
      align-items: stretch;
    }

    &__action-bar-left {
      flex-direction: column;
      align-items: flex-start;
    }

    &__action-bar-btns {
      width: 100%;

      p-button {
        flex: 1;
      }

      ::ng-deep .p-button {
        width: 100%;
        justify-content: center;
      }
    }

    // Add bottom padding to form so content is not hidden behind the fixed bar
    &__form {
      padding-bottom: 120px;
    }
  }
}

/* Full-width input fixes */
.awf__field textarea {
  width: 100%;
  resize: vertical;
}

.awf__field p-select,
.awf__field p-multiselect,
.awf__field p-inputnumber {
  display: block;
  width: 100%;
}
```

- [ ] **Step 3: Verify the complete water form HTML is correct (full file)**

The full HTML of `admin-water-form.html` after edits should open with `<p-toast />` then `<div class="awf">` containing the `awf__action-bar` div, then `<form [formGroup]="form" class="awf__form" ...>` with all the original cards (Основна інформація, Координати, Контакти, Правила рибалки, Ціни, English details, SEO details, Media). Verify by reading the file:

```bash
grep -n "awf__action-bar\|awf__back\|awf__title\|awf__slug\|awf__form\|awf__card\|Зберегти\|Опублікувати\|pickMap\|awf__thumb-img\|fileInput" /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine/apps/web/src/app/features/admin/waters/admin-water-form.html
```

Expected: each of those class/attribute names appears, `pickMap` is present on the `#pickMap` reference, `fileInput` on the `#fileInput` ref, `awf__thumb-img` on the media thumb image.

- [ ] **Step 4: Compile check**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && npx tsc -p apps/web/tsconfig.app.json --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit water form changes**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && git add apps/web/src/app/features/admin/waters/admin-water-form.html apps/web/src/app/features/admin/waters/admin-water-form.scss && git commit -m "feat(admin): water form — sticky action bar + panel polish"
```

---

## Task 8: Article form — sticky action bar + section panels polish

**Files:**
- Modify: `apps/web/src/app/features/admin/articles/admin-article-form.html`
- Modify: `apps/web/src/app/features/admin/articles/admin-article-form.scss`

- [ ] **Step 1: Replace admin-article-form.html header block**

The article form HTML currently starts with `<p-toast />` then `<div class="aaf">` with a header div. Replace the entire file with the structure below (keeping all formControlName attributes unchanged, same cards, same details blocks):

```html
<p-toast />

<div class="aaf">
  <!-- Sticky action bar -->
  <div class="aaf__action-bar">
    <div class="aaf__action-bar-left">
      <a routerLink="/admin/articles" class="aaf__back">← До списку</a>
      <div class="aaf__title-block">
        @if (id && article()) {
          <h1 class="aaf__title">{{ article()!.title }}</h1>
          <p-tag
            [severity]="statusSeverity(article()!.status)"
            [value]="statusLabel(article()!.status)"
          />
          <small class="aaf__slug">{{ article()!.slug }}</small>
        } @else {
          <h1 class="aaf__title">Нова стаття</h1>
        }
      </div>
    </div>
    <div class="aaf__action-bar-btns">
      @if (id) {
        @if (currentStatus === 'PUBLISHED') {
          <p-button
            label="У чернетку"
            severity="secondary"
            [loading]="statusUpdating()"
            (onClick)="toggleStatus()"
          />
        } @else {
          <p-button
            label="Опублікувати"
            severity="success"
            [loading]="statusUpdating()"
            (onClick)="toggleStatus()"
          />
        }
      }
      <p-button
        label="Зберегти"
        severity="primary"
        [loading]="saving()"
        (onClick)="submit()"
      />
    </div>
  </div>

  <!-- Form -->
  <form [formGroup]="form" class="aaf__form" (ngSubmit)="submit()">

    <!-- Main card -->
    <div class="aaf__card">
      <h3 class="aaf__section-title">Основна інформація</h3>

      <!-- Title -->
      <div class="aaf__field">
        <label class="aaf__label">Заголовок <span class="aaf__req">*</span></label>
        <input
          pInputText
          type="text"
          formControlName="title"
          placeholder="Заголовок статті"
          class="aaf__input"
        />
        @if (form.controls.title.invalid && form.controls.title.touched) {
          <small class="aaf__error">
            @if (form.controls.title.errors?.['required']) { Поле обов'язкове }
            @else if (form.controls.title.errors?.['minlength']) { Мінімум 3 символи }
          </small>
        }
      </div>

      <!-- Excerpt -->
      <div class="aaf__field">
        <label class="aaf__label">Короткий опис <span class="aaf__req">*</span></label>
        <textarea
          pTextarea
          formControlName="excerpt"
          placeholder="Короткий опис статті (для списків та SEO)"
          rows="2"
          class="aaf__input"
        ></textarea>
        @if (form.controls.excerpt.invalid && form.controls.excerpt.touched) {
          <small class="aaf__error">Поле обов'язкове</small>
        }
      </div>

      <!-- Content -->
      <div class="aaf__field">
        <label class="aaf__label">Текст (Markdown) <span class="aaf__req">*</span></label>
        <textarea
          pTextarea
          formControlName="content"
          placeholder="# Заголовок&#10;&#10;Текст статті у форматі Markdown..."
          class="aaf__input editor"
        ></textarea>
        @if (form.controls.content.invalid && form.controls.content.touched) {
          <small class="aaf__error">
            @if (form.controls.content.errors?.['required']) { Поле обов'язкове }
            @else if (form.controls.content.errors?.['minlength']) { Мінімум 50 символів }
          </small>
        }
      </div>
    </div>

    <!-- English block -->
    <details class="aaf__details aaf__card">
      <summary class="aaf__details-summary">English (опційно)</summary>

      <div class="aaf__grid aaf__grid--mt">
        <div class="aaf__field aaf__field--full">
          <label class="aaf__label">Title (EN)</label>
          <input pInputText type="text" formControlName="titleEn" placeholder="Article title in English" class="aaf__input" />
        </div>

        <div class="aaf__field aaf__field--full">
          <label class="aaf__label">Excerpt (EN)</label>
          <textarea
            pTextarea
            formControlName="excerptEn"
            placeholder="Short description in English"
            rows="2"
            class="aaf__input"
          ></textarea>
        </div>

        <div class="aaf__field aaf__field--full">
          <label class="aaf__label">Content (EN, Markdown)</label>
          <textarea
            pTextarea
            formControlName="contentEn"
            placeholder="# Heading&#10;&#10;Article content in English..."
            class="aaf__input editor"
          ></textarea>
        </div>
      </div>
    </details>

    <!-- SEO block -->
    <details class="aaf__details aaf__card">
      <summary class="aaf__details-summary">SEO (опційно)</summary>

      <div class="aaf__grid aaf__grid--mt">
        <div class="aaf__field">
          <label class="aaf__label">SEO Заголовок</label>
          <input pInputText type="text" formControlName="seoTitle" placeholder="SEO заголовок сторінки" class="aaf__input" />
        </div>

        <div class="aaf__field">
          <label class="aaf__label">SEO Опис</label>
          <input pInputText type="text" formControlName="seoDescription" placeholder="SEO мета-опис" class="aaf__input" />
        </div>

        <div class="aaf__field">
          <label class="aaf__label">SEO Title (EN)</label>
          <input pInputText type="text" formControlName="seoTitleEn" placeholder="SEO title in English" class="aaf__input" />
        </div>

        <div class="aaf__field">
          <label class="aaf__label">SEO Description (EN)</label>
          <input pInputText type="text" formControlName="seoDescriptionEn" placeholder="SEO description in English" class="aaf__input" />
        </div>
      </div>
    </details>

    <!-- Cover block (edit mode only) -->
    @if (id) {
      <div class="aaf__card">
        <div class="aaf__section-header">
          <h3 class="aaf__section-title">Обкладинка</h3>
          <p-button
            label="Завантажити обкладинку"
            icon="pi pi-upload"
            severity="secondary"
            [loading]="uploading()"
            [disabled]="uploading()"
            (onClick)="triggerCoverInput()"
          />
        </div>

        @if (coverCardUrl) {
          <img
            [src]="coverCardUrl"
            alt="Обкладинка статті"
            class="aaf__cover-preview"
            loading="lazy"
          />
        } @else {
          <div class="aaf__cover-placeholder">Обкладинку ще не завантажено</div>
        }

        <input
          #coverInput
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="aaf__file-hidden"
          (change)="onCoverFile($event)"
        />
      </div>
    }

  </form>
</div>
```

- [ ] **Step 2: Replace admin-article-form.scss**

Replace the entire file with:

```scss
.aaf {
  max-width: 900px;

  // ── Action bar ────────────────────────────────────────────────────────────
  &__action-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--surface);
    padding: 12px 0;
    margin-left: -4px;
    margin-right: -4px;
    padding-left: 4px;
    padding-right: 4px;
  }

  &__action-bar-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    flex: 1;
    min-width: 0;
  }

  &__action-bar-btns {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
  }

  &__back {
    color: var(--accent);
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover {
      text-decoration: underline;
    }
  }

  &__title-block {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    min-width: 0;
  }

  &__title {
    font-family: var(--font-head);
    font-size: 1.3rem;
    font-weight: 800;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__slug {
    color: var(--muted);
    font-size: 0.8rem;
  }

  // ── Section cards ────────────────────────────────────────────────────────
  &__card {
    background: var(--card);
    border-radius: var(--radius);
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: var(--shadow);
  }

  &__section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__section-title {
    font-family: var(--font-head);
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--muted);
    margin: 0 0 18px 0;
  }

  &__section-header &__section-title {
    margin-bottom: 0;
  }

  // ── Grid ─────────────────────────────────────────────────────────────────
  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;

    &--mt {
      margin-top: 16px;
    }

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  }

  // ── Fields ───────────────────────────────────────────────────────────────
  &__field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;

    &--full {
      grid-column: 1 / -1;
    }
  }

  &__label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__req {
    color: #ef4444;
    text-transform: none;
  }

  &__input {
    width: 100%;
  }

  &__error {
    font-size: 0.78rem;
    color: #ef4444;
  }

  // ── Details (collapsible) ─────────────────────────────────────────────────
  &__details {
    cursor: default;

    &-summary {
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--muted);
      list-style: none;
      user-select: none;
      padding: 0 0 4px 0;
      margin-bottom: 0;
      display: flex;
      align-items: center;
      gap: 6px;

      &::before {
        content: '▶';
        font-size: 0.65em;
        transition: transform 0.2s;
        display: inline-block;
      }
    }
  }

  details[open] &__details-summary::before {
    transform: rotate(90deg);
  }

  // ── Cover ─────────────────────────────────────────────────────────────────
  &__file-hidden {
    display: none;
  }

  &__cover-preview {
    display: block;
    max-width: 320px;
    width: 100%;
    border-radius: 8px;
    margin-bottom: 16px;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
    object-fit: cover;
    aspect-ratio: 16 / 9;
  }

  &__cover-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 320px;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 8px;
    border: 2px dashed var(--line);
    background: var(--surface);
    color: var(--muted);
    font-size: 0.88rem;
    margin-bottom: 16px;
  }

  // ── Mobile action bar → fixed bottom bar ──────────────────────────────────
  @media (max-width: 700px) {
    &__action-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      top: auto;
      z-index: 300;
      background: var(--card);
      border-top: 1px solid var(--line);
      padding: 12px 16px;
      padding-bottom: calc(12px + env(safe-area-inset-bottom));
      margin: 0;
      box-shadow: 0 -2px 12px rgba(11, 27, 34, 0.1);
      flex-direction: column;
      align-items: stretch;
    }

    &__action-bar-left {
      flex-direction: column;
      align-items: flex-start;
    }

    &__action-bar-btns {
      width: 100%;

      p-button {
        flex: 1;
      }

      ::ng-deep .p-button {
        width: 100%;
        justify-content: center;
      }
    }

    &__form {
      padding-bottom: 120px;
    }
  }
}

/* Editor monospace textarea */
.aaf__field textarea.editor {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace;
  font-size: 0.88rem;
  line-height: 1.6;
  min-height: 50vh;
  resize: vertical;
  tab-size: 2;
}

/* Full-width textarea fix */
.aaf__field textarea {
  width: 100%;
  resize: vertical;
}
```

- [ ] **Step 3: Compile check**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && npx tsc -p apps/web/tsconfig.app.json --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit article form changes**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && git add apps/web/src/app/features/admin/articles/admin-article-form.html apps/web/src/app/features/admin/articles/admin-article-form.scss && git commit -m "feat(admin): article form — sticky action bar + panel polish"
```

---

## Task 9: Login page — polish

**Files:**
- Modify: `apps/web/src/app/features/admin/login/admin-login.scss`

The login page is already decent. We just adjust card max-width to 380px and ensure mobile padding.

- [ ] **Step 1: Update admin-login.scss**

Replace the `&__card` block (max-width line) and add mobile media query at end:

```scss
.alog {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--hero-from) 0%, var(--hero-to) 100%);
  padding: 20px;

  &__card {
    width: 100%;
    max-width: 380px;
    padding: 40px 36px 36px;
    border-radius: var(--radius);
    box-shadow: var(--shadow-lift);
  }

  &__logo {
    font-family: var(--font-head);
    font-size: 2rem;
    font-weight: 800;
    color: var(--primary);
    text-align: center;
    margin-bottom: 8px;

    em {
      color: var(--accent);
      font-style: normal;
    }
  }

  &__title {
    font-size: 1.2rem;
    font-weight: 700;
    text-align: center;
    color: var(--ink);
    margin-bottom: 28px;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
      font: 600 0.875rem var(--font-body);
      color: var(--ink);
    }

    input {
      padding: 10px 14px;
      border: 1.5px solid var(--line);
      border-radius: 8px;
      font: 1rem var(--font-body);
      color: var(--ink);
      background: #fff;
      transition: border-color 0.15s;

      &:focus {
        outline: none;
        border-color: var(--primary);
      }

      &::placeholder {
        color: var(--muted);
      }
    }
  }

  &__error {
    margin: 0;
    padding: 10px 14px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #dc2626;
    font: 0.875rem var(--font-body);
  }

  &__btn {
    width: 100%;
    justify-content: center;
    padding: 12px;
    border-radius: 8px;
    font-size: 1rem;

    &:disabled {
      opacity: 0.65;
      cursor: not-allowed;
      transform: none;
    }
  }

  @media (max-width: 440px) {
    padding: 12px;

    &__card {
      padding: 28px 20px 24px;
    }
  }
}
```

- [ ] **Step 2: Commit login polish**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && git add apps/web/src/app/features/admin/login/admin-login.scss && git commit -m "feat(admin): login — max-width 380 + mobile padding"
```

---

## Task 10: Build + E2E verification

- [ ] **Step 1: Run full build**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && npm run build 2>&1 | tail -30
```

Expected: BUILD SUCCESS, no errors. Check admin lazy chunks appear. Check public initial bundle size is comparable to pre-overhaul (~423 kB).

- [ ] **Step 2: Run E2E script**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && node scripts/admin-e2e.mjs 2>&1
```

Expected: ALL STEPS PASSED, 0 failures, 0 NG0 errors.

If Step 7 (Logout) fails because `.ash__bar button` is not found: the new shell HTML wraps the sidebar in `class="ash__sidebar ash__bar"`. The script does `document.querySelectorAll('.ash__bar button')` — it will find all buttons inside the sidebar, including `Вийти`. This should work. If not, the fallback in the script (`document.querySelectorAll('button')` → textContent includes `Вийти`) will catch it.

- [ ] **Step 3: Run overflow check (desktop 1366x900)**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && node -e "
const puppeteer = require('./node_modules/puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  // Login first
  await page.goto('http://localhost:4201/admin/login', { waitUntil: 'networkidle2' });
  await page.type('input[name=\"login\"]', 'admin');
  await page.type('input[type=\"password\"]', 'admin12345');
  await page.click('button[type=\"submit\"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  const pages = ['/admin/waters', '/admin/articles', '/admin/reviews', '/admin/articles/new'];
  for (const p of pages) {
    await page.goto('http://localhost:4201' + p, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log('DESKTOP', p, overflow ? 'OVERFLOW!' : 'OK');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
" 2>&1
```

Expected: each line shows `OK`.

- [ ] **Step 4: Run overflow check (mobile 390x844)**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && node -e "
const puppeteer = require('./node_modules/puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  await page.goto('http://localhost:4201/admin/login', { waitUntil: 'networkidle2' });
  await page.type('input[name=\"login\"]', 'admin');
  await page.type('input[type=\"password\"]', 'admin12345');
  await page.click('button[type=\"submit\"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  const pages = ['/admin/waters', '/admin/articles', '/admin/reviews', '/admin/articles/new'];
  for (const p of pages) {
    await page.goto('http://localhost:4201' + p, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log('MOBILE 390', p, overflow ? 'OVERFLOW!' : 'OK');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
" 2>&1
```

Expected: each line shows `OK`.

- [ ] **Step 5: Sidebar + burger presence check**

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && node -e "
const puppeteer = require('./node_modules/puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  // Desktop sidebar check
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto('http://localhost:4201/admin/login', { waitUntil: 'networkidle2' });
  await page.type('input[name=\"login\"]', 'admin');
  await page.type('input[type=\"password\"]', 'admin12345');
  await page.click('button[type=\"submit\"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  const sidebarW = await page.evaluate(() => {
    const s = document.querySelector('.ash__sidebar');
    return s ? getComputedStyle(s).width : 'not found';
  });
  console.log('DESKTOP sidebar width:', sidebarW);
  // Mobile burger check
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto('http://localhost:4201/admin/waters', { waitUntil: 'networkidle2' });
  const hasBurger = await page.evaluate(() => !!document.querySelector('.ash__burger'));
  const burgerVisible = await page.evaluate(() => {
    const b = document.querySelector('.ash__burger');
    if (!b) return false;
    const s = getComputedStyle(b);
    return s.display !== 'none' && s.visibility !== 'hidden';
  });
  console.log('MOBILE burger present:', hasBurger, 'visible:', burgerVisible);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
" 2>&1
```

Expected: `DESKTOP sidebar width: 240px`, `MOBILE burger present: true visible: true`.

- [ ] **Step 6: Final commit (squash all into one message)**

After all checks pass:

```bash
cd /Users/admin/Desktop/dev/fishing-in-ukraine/fishing-in-ukraine && git add -A && git commit -m "feat(web): admin ui overhaul — sidebar shell, panel layout, mobile responsiveness"
```

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Covered by |
|-----------------|------------|
| Fixed left sidebar 240px | Task 2+3 |
| Logo + label in sidebar | Task 2 |
| Nav vertical with icons | Task 2 |
| routerLinkActive pill highlight + accent left bar | Task 3 SCSS |
| Bottom footer: «На сайт ↗» + «Вийти» | Task 2 |
| Mobile <900px: sidebar off-canvas, burger | Task 2+3 |
| Backdrop click closes sidebar | Task 2 |
| Content padding 28px 32px desktop / 16px mobile | Task 3 |
| max-width 1280px main | Task 3 |
| Page header: h1 + subtitle + action btn | Tasks 4+5+6 |
| Filters row in `.panel` card | Tasks 4+5+6 |
| Table in `.panel--flush` | Tasks 4+5+6 |
| Row hover bg #f4f9fa | Tasks 4+5+6 SCSS deep |
| Cell vertical padding 12px | Tasks 4+5+6 SCSS deep |
| `.panel--scroll` overflow-x with min-width | Tasks 4+5+6 |
| Sticky action bar on forms | Tasks 7+8 |
| Fixed bottom bar on mobile forms | Tasks 7+8 |
| Section headings small caps muted | Tasks 7+8 (labels uppercase muted) |
| Map height 320px / 260px mobile | Task 7 |
| Media section: upload btn in header right | Task 7 |
| Login: card 380, logo bigger, full-width btn | Task 9 |
| E2E labels unchanged | All tasks — formControlNames/labels kept identical |
| `.ash__bar` class present for e2e logout | Task 2 — `ash__sidebar ash__bar` on the aside |
| No *.spec.ts created | N/A — no test files created |
| Commit message exact | Task 10 Step 6 |

### Placeholder scan

No TBD/TODO/placeholder language found.

### Type consistency

- `sidebarOpen: signal<boolean>` used in both `admin-shell.ts` and `admin-shell.html` as `sidebarOpen()` — consistent.
- All formControlName attributes are preserved verbatim from the originals.
- `.awf__slug` class preserved for e2e step 4 slug capture.
- `.awf__thumb-img` class preserved for e2e step 3.
- `.ash__bar` class: applied to `<aside class="ash__sidebar ash__bar">` — e2e script `document.querySelectorAll('.ash__bar button')` will find the Вийти button.
