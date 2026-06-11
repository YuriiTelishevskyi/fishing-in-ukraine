import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-lang-switcher',
  imports: [RouterLink],
  templateUrl: './lang-switcher.html',
  styleUrl: './lang-switcher.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangSwitcher {
  private readonly locale = inject(LocaleService);
  pair = input.required<{ uk: string; en: string }>();
  readonly current = computed(() => this.locale.locale());
}
