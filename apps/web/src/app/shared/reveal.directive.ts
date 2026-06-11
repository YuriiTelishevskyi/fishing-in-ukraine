import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

@Directive({ selector: '[appReveal]', host: { class: 'reveal' } })
export class RevealDirective {
  private readonly el = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => {
      const node = this.el.nativeElement;
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
