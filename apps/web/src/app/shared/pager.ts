import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-pager',
  imports: [TranslocoPipe],
  templateUrl: './pager.html',
  styleUrl: './pager.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pager {
  page = input.required<number>();
  perPage = input.required<number>();
  total = input.required<number>();

  pageChange = output<number>();

  readonly pages = computed(() => Math.ceil(this.total() / this.perPage()) || 1);

  prev() {
    if (this.page() > 1) this.pageChange.emit(this.page() - 1);
  }

  next() {
    if (this.page() < this.pages()) this.pageChange.emit(this.page() + 1);
  }
}
