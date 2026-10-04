import { Directive, ElementRef, afterNextRender, inject, input, numberAttribute } from '@angular/core';

/**
 * Fades an element in once when it enters the viewport.
 * Motion job: hierarchy. Content appears in reading order, staggered by the optional index.
 */
@Directive({
  selector: '[appReveal]',
  host: { 'data-reveal': '', '[style.--i]': 'index()' },
})
export class RevealDirective {
  readonly index = input(0, {
    alias: 'appReveal',
    transform: (v: unknown) => numberAttribute(v, 0),
  });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      const node = this.el.nativeElement;
      if (!('IntersectionObserver' in window)) {
        node.classList.add('is-in');
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              node.classList.add('is-in');
              io.disconnect();
            }
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
      );
      io.observe(node);
    });
  }
}
