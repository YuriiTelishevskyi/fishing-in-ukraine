import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

export interface SelectOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  template: `
    <div class="ss" role="combobox" [attr.aria-expanded]="open()" aria-haspopup="listbox">
      <button
        #trigger
        type="button"
        class="ss__trigger"
        [class.ss__trigger--open]="open()"
        [attr.aria-expanded]="open()"
        (click)="toggle()"
        (keydown)="onTriggerKeydown($event)"
      >
        <span class="ss__value" [class.ss__value--placeholder]="!selectedLabel()">
          {{ selectedLabel() || placeholder() }}
        </span>
        <span class="ss__caret" aria-hidden="true">▾</span>
      </button>

      @if (open()) {
        <div class="ss__popover">
          <input
            #search
            type="text"
            class="ss__search"
            [placeholder]="placeholder()"
            [value]="query()"
            (input)="onSearchInput($event)"
            (keydown)="onSearchKeydown($event)"
            autocomplete="off"
            spellcheck="false"
            aria-label="Search"
          />
          <ul class="ss__list" role="listbox">
            @for (opt of filtered(); track opt.value) {
              <li
                role="option"
                class="ss__option"
                [class.ss__option--active]="$index === highlighted()"
                [class.ss__option--selected]="opt.value === value()"
                [attr.aria-selected]="opt.value === value()"
                (mouseenter)="highlighted.set($index)"
                (mousedown)="$event.preventDefault()"
                (click)="select(opt)"
              >
                {{ opt.label }}
              </li>
            } @empty {
              <li class="ss__empty">—</li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .ss {
        position: relative;
        width: 100%;
      }
      .ss__trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        width: 100%;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: calc(var(--radius) / 2);
        padding: 0.55rem 0.75rem;
        font-size: 0.95rem;
        color: var(--text);
        cursor: pointer;
        text-align: left;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .ss__trigger:hover {
        border-color: var(--accent);
      }
      .ss__trigger:focus-visible,
      .ss__trigger--open {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
      }
      .ss__value {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ss__value--placeholder {
        color: var(--muted);
      }
      .ss__caret {
        flex-shrink: 0;
        font-size: 0.7rem;
        color: var(--muted);
        transition: transform 0.15s;
      }
      .ss__trigger--open .ss__caret {
        transform: rotate(180deg);
      }
      .ss__popover {
        position: absolute;
        z-index: 50;
        top: calc(100% + 0.35rem);
        left: 0;
        right: 0;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: calc(var(--radius) / 2);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
        overflow: hidden;
      }
      .ss__search {
        width: 100%;
        box-sizing: border-box;
        border: none;
        border-bottom: 1px solid var(--line);
        padding: 0.6rem 0.75rem;
        font-size: 0.95rem;
        color: var(--text);
        background: var(--surface);
      }
      .ss__search:focus {
        outline: none;
        background: color-mix(in srgb, var(--accent) 6%, var(--surface));
      }
      .ss__list {
        list-style: none;
        margin: 0;
        padding: 0.25rem;
        max-height: 16rem;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
      .ss__option {
        padding: 0.55rem 0.65rem;
        font-size: 0.95rem;
        color: var(--text);
        border-radius: calc(var(--radius) / 3);
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ss__option--active {
        background: color-mix(in srgb, var(--accent) 14%, transparent);
      }
      .ss__option--selected {
        font-weight: 600;
        color: var(--accent);
      }
      .ss__empty {
        padding: 0.75rem;
        text-align: center;
        color: var(--muted);
        font-size: 0.9rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchableSelect {
  readonly options = input<SelectOption[]>([]);
  readonly placeholder = input('');
  readonly value = input<number | null>(null);

  readonly valueChange = output<number>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  readonly open = signal(false);
  readonly query = signal('');
  readonly highlighted = signal(0);

  readonly selectedLabel = computed(() => {
    const v = this.value();
    if (v === null) return '';
    return this.options().find((o) => o.value === v)?.label ?? '';
  });

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const opts = this.options();
    if (!q) return opts;
    return opts.filter((o) => o.label.toLowerCase().includes(q));
  });

  constructor() {
    afterNextRender(() => {
      const onDocClick = (e: MouseEvent) => {
        if (this.open() && !this.host.nativeElement.contains(e.target as Node)) {
          this.close();
        }
      };
      document.addEventListener('click', onDocClick, true);
      this.destroyRef.onDestroy(() => document.removeEventListener('click', onDocClick, true));
    });
  }

  toggle(): void {
    this.open() ? this.close() : this.openPopover();
  }

  private openPopover(): void {
    this.query.set('');
    this.highlighted.set(0);
    this.open.set(true);
    // Focus the search field once the popover is rendered.
    queueMicrotask(() => this.searchInput()?.nativeElement.focus());
  }

  private close(): void {
    this.open.set(false);
  }

  select(opt: SelectOption): void {
    this.valueChange.emit(opt.value);
    this.close();
    this.trigger()?.nativeElement.focus();
  }

  onSearchInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.highlighted.set(0);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const list = this.filtered();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlighted.update((i) => Math.min(i + 1, list.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlighted.update((i) => Math.max(i - 1, 0));
        break;
      case 'Enter': {
        event.preventDefault();
        const opt = list[this.highlighted()];
        if (opt) this.select(opt);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close();
        this.trigger()?.nativeElement.focus();
        break;
    }
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open()) {
      event.preventDefault();
      this.close();
    } else if ((event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') && !this.open()) {
      event.preventDefault();
      this.openPopover();
    }
  }
}
