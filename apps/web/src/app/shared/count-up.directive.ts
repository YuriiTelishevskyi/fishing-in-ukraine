import { Directive, ElementRef, PLATFORM_ID, effect, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective {
  readonly appCountUp = input.required<number>();

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private started = false;

  constructor() {
    effect(() => {
      const target = this.appCountUp();

      // Wait until the value is non-zero (data has arrived) and we haven't started yet
      if (!this.isBrowser || target <= 0 || this.started) return;

      this.started = true;
      const node = this.el.nativeElement;

      // Reduced-motion: show value immediately
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        node.textContent = String(target);
        return;
      }

      // No IntersectionObserver support: show value immediately
      if (!('IntersectionObserver' in window)) {
        node.textContent = String(target);
        return;
      }

      // Animate when scrolled into view
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              io.disconnect();
              // Read current value at animation start (not captured at setup time)
              const animTarget = this.appCountUp();
              const start = performance.now();
              const duration = 900;
              function step(now: number) {
                const t = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
                node.textContent = String(Math.round(eased * animTarget));
                if (t < 1) requestAnimationFrame(step);
              }
              requestAnimationFrame(step);
            }
          }
        },
        { threshold: 0.2 },
      );

      io.observe(node);
    });
  }
}
