import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LanguageService } from '../../core/i18n/language.service';

gsap.registerPlugin(ScrollTrigger);

/**
 * "From signal to invoice". Motion job: storytelling. The four steps of the workshop flow
 * are read in order while the section stays pinned and the track pans sideways.
 * Below 900px, or with reduced motion, it is a plain swipeable row.
 */
@Component({
  selector: 'app-how',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    <section #section id="how" class="how">
      <div class="wrap head">
        <h2>{{ 'how.title' | transloco }}</h2>
      </div>

      <div #track class="track">
        @for (s of steps; track s.icon; let i = $index) {
          <article class="step">
            <span class="icon"><i [class]="'ph ' + s.icon" aria-hidden="true"></i></span>
            <h3>{{ 'how.steps.' + i + '.title' | transloco }}</h3>
            <p>{{ 'how.steps.' + i + '.text' | transloco }}</p>
          </article>
        }
      </div>

      <div class="wrap progress" aria-hidden="true">
        <span #bar></span>
      </div>
    </section>
  `,
  styles: `
    .how {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: clamp(32px, 6vh, 64px);
      padding-block: 96px;
      background: var(--inverse-bg);
      color: var(--inverse-fg);
      overflow: hidden;
    }

    h2 { font-size: clamp(2.2rem, 5vw, 4.2rem); font-weight: 800; letter-spacing: -0.04em; }

    .track {
      display: flex;
      gap: 24px;
      width: max-content;
      padding-inline: max(var(--gutter), calc((100vw - var(--page-max)) / 2 + var(--gutter)));
      will-change: transform;
    }

    .step {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: min(82vw, 400px);
      min-height: 320px;
      padding: 32px;
      border: 1px solid var(--inverse-line);
      border-radius: var(--r-card);
    }

    .icon {
      display: grid;
      place-items: center;
      width: 60px;
      height: 60px;
      margin-bottom: auto;
      border-radius: var(--r-pill);
      background: var(--c-primary);
      color: var(--c-white);
      font-size: 1.7rem;
    }

    h3 { font-size: 1.7rem; font-weight: 700; letter-spacing: -0.03em; }

    .step p { color: var(--inverse-muted); }

    .progress {
      height: 2px;
      background: var(--inverse-line);
      border-radius: 2px;
      overflow: hidden;
      max-width: calc(var(--page-max) - 2 * var(--gutter));
      width: calc(100% - 2 * var(--gutter));
    }

    .progress span {
      display: block;
      height: 100%;
      background: var(--c-primary-soft);
      transform: scaleX(0);
      transform-origin: left;
    }

    @media (max-width: 899px), (prefers-reduced-motion: reduce) {
      .how { min-height: 0; padding-block: 72px; }
      .track { width: auto; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 12px; }
      .step { flex: none; scroll-snap-align: start; min-height: 280px; }
      .progress { display: none; }
    }
  `,
})
export class HowComponent {
  protected readonly steps = [
    { icon: 'ph-plugs-connected' },
    { icon: 'ph-bell-ringing' },
    { icon: 'ph-clipboard-text' },
    { icon: 'ph-receipt' },
  ];

  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(LanguageService);

  constructor() {
    // Text length changes with the language, so the pan distance must be measured again.
    effect(() => {
      this.language.lang();
      queueMicrotask(() => ScrollTrigger.refresh());
    });

    afterNextRender(() => {
      const section = this.section().nativeElement;
      const track = this.track().nativeElement;
      const bar = this.bar().nativeElement;
      const mm = gsap.matchMedia();

      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
        gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              bar.style.transform = `scaleX(${self.progress})`;
            },
          },
        });
      });

      this.destroyRef.onDestroy(() => mm.revert());
    });
  }
}
