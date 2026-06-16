import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { WaterListItemDto } from '@fishing/shared';
import { LocaleService } from '../core/locale.service';
import { WaterPlaceholder } from './water-placeholder';

@Component({
  selector: 'app-water-card',
  imports: [RouterLink, NgOptimizedImage, TranslocoPipe, WaterPlaceholder],
  templateUrl: './water-card.html',
  styleUrl: './water-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaterCard {
  private readonly locale = inject(LocaleService);
  water = input.required<WaterListItemDto>();
  /** Set on the above-the-fold card so NgOptimizedImage marks it as the LCP image. */
  priority = input(false);
  distanceKm = input<number | null>(null);
  readonly link = computed(() =>
    this.locale.link('catalog', this.water().regionSlug, this.water().slug),
  );
  readonly topFish = computed(() => this.water().fishNames.slice(0, 3));
}
