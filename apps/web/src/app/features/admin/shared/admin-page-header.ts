import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Shared admin page header — the uniform top of every admin list/form page.
 *
 *   <app-admin-page-header title="Відгуки" [subtitle]="total() + ' записів'">
 *     <!-- optional right-aligned actions (buttons, filters) -->
 *     <p-button label="Додати" icon="pi pi-plus" />
 *   </app-admin-page-header>
 *
 * Renders a big brand title, an optional muted subtitle, a right-aligned
 * content-projection slot for actions, and a divider below. OnPush, standalone.
 */
@Component({
  selector: 'app-admin-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="aph">
      <div class="aph__titles">
        <h1 class="aph__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="aph__subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="aph__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: [
    `
      .aph {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        margin: 0 0 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--line, #e2ecef);
      }
      .aph__titles {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .aph__title {
        font-family: var(--font-head, system-ui, sans-serif);
        font-size: 1.5rem;
        font-weight: 800;
        line-height: 1.15;
        color: var(--ink, #0b1b22);
        margin: 0;
      }
      .aph__subtitle {
        font-size: 0.88rem;
        color: var(--muted, #5b7480);
        margin: 0;
      }
      .aph__actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        flex-shrink: 0;
      }
      @media (max-width: 600px) {
        .aph {
          align-items: flex-start;
          flex-direction: column;
        }
        .aph__actions {
          width: 100%;
        }
      }
    `,
  ],
})
export class AdminPageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string | undefined>(undefined);
}
