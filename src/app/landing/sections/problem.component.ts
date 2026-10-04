import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/reveal.directive';

/**
 * Statement section. Motion job: storytelling. Words light up at reading pace as the
 * section crosses the screen. Uses CSS scroll-driven animation; browsers without it
 * simply show the full text.
 */
@Component({
  selector: 'app-problem',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, RevealDirective],
  template: `
    <section class="problem">
      <div class="wrap">
        <h2 class="statement">
          @for (w of words(); track $index) {
            <span class="word" [style.--i]="$index">{{ w }} </span>
          }
        </h2>
        <p class="detail" appReveal>{{ 'problem.detail' | transloco }}</p>
      </div>
    </section>
  `,
  styles: `
    .problem { padding-block: clamp(96px, 16vw, 200px); }

    .statement {
      max-width: 17ch;
      font-size: clamp(2.4rem, 6.4vw, 5.6rem);
      font-weight: 800;
      letter-spacing: -0.045em;
      line-height: 1.02;
    }

    .detail {
      max-width: 44ch;
      margin-top: clamp(28px, 4vw, 48px);
      margin-left: clamp(0px, 12vw, 180px);
      font-size: clamp(1.05rem, 1.5vw, 1.25rem);
      color: var(--muted);
    }

    @supports (animation-timeline: view()) {
      @media (prefers-reduced-motion: no-preference) {
        .word {
          opacity: 0.5;
          animation: light linear both;
          animation-timeline: view();
          animation-range: entry calc(12% + var(--i) * 1.6%) entry calc(52% + var(--i) * 2%);
        }
      }
    }

    @keyframes light { to { opacity: 1; } }

    @media (max-width: 720px) {
      .detail { margin-left: 0; }
    }
  `,
})
export class ProblemComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly text = toSignal(this.transloco.selectTranslate('problem.statement'), {
    initialValue: '',
  });
  protected readonly words = computed(() => this.text().split(' ').filter(Boolean));
}
