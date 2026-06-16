import {
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Scroll-reveal. SSR-safe: the hidden pre-reveal `reveal` class is added in the
 * BROWSER ONLY — the server renders the element fully visible, so content is
 * present and visible with JS disabled. In the browser we add `reveal`
 * (opacity:0, translateY) and flip to `is-visible` once the element enters the
 * viewport (once). `prefers-reduced-motion` → show immediately (no transform).
 *
 * Optional `appReveal` value sets a stagger delay in ms via `transition-delay`.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective {
  /** Optional stagger delay in milliseconds. */
  readonly appReveal = input<number | '' | undefined>();

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (!this.isBrowser) return;

    const node = this.el.nativeElement;

    // Reduced-motion: never hide, never animate.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    // Apply the hidden pre-reveal state in the browser only (SSR stays visible).
    node.classList.add('reveal');

    const delay = Number(this.appReveal());
    if (delay > 0) node.style.transitionDelay = `${delay}ms`;

    afterNextRender(() => {
      if (!('IntersectionObserver' in window)) {
        node.classList.add('is-visible');
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              node.classList.add('is-visible');
              io.disconnect();
            }
          }
        },
        { threshold: 0.12 },
      );
      io.observe(node);
    });
  }
}
