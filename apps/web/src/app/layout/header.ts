import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleService } from '../core/locale.service';
import { LangSwitcher } from './lang-switcher';

@Component({
  selector: 'app-header',
  imports: [RouterLink, TranslocoPipe, LangSwitcher],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  solid = input(false);
  pair = input<{ uk: string; en: string }>({ uk: '/', en: '/en' });
  readonly loc = inject(LocaleService);

  readonly menuOpen = signal(false);

  constructor() {
    const router = inject(Router);
    router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) this.menuOpen.set(false);
    });
  }

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }
}
