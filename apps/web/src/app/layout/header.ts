import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleService } from '../core/locale.service';
import { LangSwitcher } from './lang-switcher';

/** Hide the header only after scrolling DOWN past this many px; reset to shown near the top. */
const HIDE_THRESHOLD = 80;
/** Desktop nav appears above this width (mirrors the `$mobile-bp: 720px` SCSS breakpoint). */
const DESKTOP_MIN_WIDTH = 721;

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, TranslocoPipe, LangSwitcher],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  solid = input(false);
  pair = input<{ uk: string; en: string }>({ uk: '/', en: '/en' });
  readonly loc = inject(LocaleService);

  readonly menuOpen = signal(false);
  /** True when the header is slid out of view (desktop scroll-down). */
  readonly hidden = signal(false);

  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    const router = inject(Router);
    router.events.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e instanceof NavigationEnd) this.menuOpen.set(false);
    });

    if (isPlatformBrowser(this.platformId)) {
      const destroyRef = inject(DestroyRef);
      afterNextRender(() => this.installScrollListener(destroyRef));
    }
  }

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  /** Browser-only: rAF-throttled scroll listener that hides on scroll-down (desktop only). */
  private installScrollListener(destroyRef: DestroyRef) {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      // Mobile uses the burger — never hide the header there.
      const isDesktop = window.innerWidth >= DESKTOP_MIN_WIDTH;

      if (!isDesktop || this.menuOpen()) {
        this.hidden.set(false);
      } else if (y < HIDE_THRESHOLD || y < lastY) {
        // Near the top, or scrolling up → show.
        this.hidden.set(false);
      } else if (y > lastY) {
        // Scrolling down past the threshold → hide.
        this.hidden.set(true);
      }
      lastY = y;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
  }
}
