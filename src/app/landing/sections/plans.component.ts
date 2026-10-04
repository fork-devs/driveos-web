import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/reveal.directive';

/** Two plans, no prices yet (the project document defines the BASICO and PRO tiers only). */
@Component({
  selector: 'app-plans',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, RevealDirective],
  template: `
    <section id="plans" class="plans">
      <div class="wrap">
        <h2 appReveal>{{ 'plans.title' | transloco }}</h2>

        <div class="grid">
          @for (p of plans; track p; let i = $index) {
            <article class="plan" [class.pro]="p === 'pro'" [appReveal]="i">
              <h3>{{ 'plans.' + p + '.name' | transloco }}</h3>
              <p class="text">{{ 'plans.' + p + '.text' | transloco }}</p>
              <ul>
                @for (n of [0, 1, 2]; track n) {
                  <li>
                    <i class="ph ph-check-circle" aria-hidden="true"></i>
                    {{ 'plans.' + p + '.items.' + n | transloco }}
                  </li>
                }
              </ul>
              <a class="btn" href="#demo">{{ 'plans.cta' | transloco }}</a>
            </article>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .plans { padding-block: clamp(80px, 12vw, 160px); }

    h2 {
      font-size: clamp(2.2rem, 5vw, 4.2rem);
      font-weight: 800;
      letter-spacing: -0.04em;
      margin-bottom: clamp(32px, 5vw, 64px);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .plan {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: clamp(28px, 3.5vw, 44px);
      border: 1px solid var(--line);
      border-radius: var(--r-card);
      background: var(--card);
    }

    .plan.pro {
      border-color: var(--c-primary);
      background:
        linear-gradient(rgb(0 113 235 / 0.84), rgb(0 113 235 / 0.84)),
        url('/brand/pattern-blue.png') right top / 260px auto,
        var(--c-primary);
      color: var(--c-white);
    }

    h3 { font-size: clamp(1.8rem, 3vw, 2.6rem); font-weight: 800; letter-spacing: -0.04em; }

    .text { max-width: 34ch; color: var(--muted); }
    .pro .text { color: #e6f0ff; }

    ul { display: grid; gap: 10px; margin-bottom: 12px; }
    li { display: flex; align-items: center; gap: 10px; }
    li i { font-size: 1.35rem; color: var(--c-primary); flex: none; }
    .pro li i { color: var(--c-white); }

    .btn { margin-top: auto; align-self: flex-start; background: var(--c-primary); color: var(--c-white); }
    .btn:hover { background: var(--c-primary-dark); }
    .pro .btn { background: var(--c-white); color: var(--c-primary-dark); }
    .pro .btn:hover { background: var(--c-surface-white); }

    @media (max-width: 760px) {
      .grid { grid-template-columns: 1fr; }
    }
  `,
})
export class PlansComponent {
  protected readonly plans = ['basic', 'pro'] as const;
}
