import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
  signal,
  computed,
} from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  template: `
    <span
      class="stars"
      [class.stars--interactive]="interactive()"
      [attr.aria-label]="'Оцінка ' + value() + ' з 5'"
      role="img"
    >
      @for (i of indices; track i) {
        @if (interactive()) {
          <button
            type="button"
            class="star"
            [class.star--on]="i < (hovered() ?? value())"
            (click)="onStarClick(i + 1)"
            (mouseenter)="hovered.set(i + 1)"
            (mouseleave)="hovered.set(null)"
            [attr.aria-label]="'Поставити ' + (i + 1) + ' зір'"
          >★</button>
        } @else {
          <span
            class="star"
            [class.star--on]="i < Math.round(value())"
          >★</span>
        }
      }
    </span>
  `,
  styles: [`
    .stars { display: inline-flex; gap: 2px; }
    .star {
      font-size: 1.1rem;
      color: #ccc;
      line-height: 1;
      transition: color 0.1s;
    }
    .star--on { color: var(--primary, #f59e0b); }
    .stars--interactive .star {
      background: none;
      border: none;
      padding: 0 1px;
      cursor: pointer;
      font-size: 1.4rem;
    }
    .stars--interactive .star:focus-visible {
      outline: 2px solid var(--primary, #f59e0b);
      border-radius: 2px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarRating {
  readonly value = input<number>(0);
  readonly interactive = input<boolean>(false);

  readonly valueChange = output<number>();

  readonly hovered = signal<number | null>(null);

  readonly indices = [0, 1, 2, 3, 4];
  readonly Math = Math;

  onStarClick(rating: number): void {
    this.valueChange.emit(rating);
  }
}
