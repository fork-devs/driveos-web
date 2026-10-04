import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/reveal.directive';

/** Architecture targets from the project document (QA-01, QA-04, QA-05), shown as three rows. */
@Component({
  selector: 'app-trust',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, RevealDirective],
  template: `
    <section class="trust">
      <div class="wrap">
        <h2 appReveal>{{ 'trust.title' | transloco }}</h2>

        <ul class="rows">
          @for (n of items; track n) {
            <li class="row" [appReveal]="n">
              <p class="value">{{ 'trust.items.' + n + '.value' | transloco }}</p>
              <div class="label">
                <h3>{{ 'trust.items.' + n + '.unit' | transloco }}</h3>
                <p>{{ 'trust.items.' + n + '.text' | transloco }}</p>
              </div>
            </li>
          }
        </ul>

        <p class="note" appReveal>{{ 'trust.note' | transloco }}</p>
      </div>
    </section>
  `,
  styles: `
    .trust {
      padding-block: clamp(80px, 12vw, 160px);
      background: var(--inverse-bg);
      color: var(--inverse-fg);
    }

    h2 {
      font-size: clamp(2.2rem, 5vw, 4.2rem);
      font-weight: 800;
      letter-spacing: -0.04em;
      margin-bottom: clamp(32px, 5vw, 64px);
    }

    .row {
      display: grid;
      grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
      align-items: center;
      gap: 24px;
      padding-block: clamp(24px, 3.5vw, 44px);
      border-top: 1px solid var(--inverse-line);
    }

    .row:last-child { border-bottom: 1px solid var(--inverse-line); }

    .value {
      font-size: clamp(4rem, 11vw, 9rem);
      font-weight: 800;
      letter-spacing: -0.06em;
      line-height: 0.9;
      font-variant-numeric: tabular-nums;
      color: var(--c-primary-soft);
    }

    h3 { font-size: clamp(1.3rem, 2vw, 1.8rem); font-weight: 700; letter-spacing: -0.03em; margin-bottom: 6px; }

    .label p { color: var(--inverse-muted); max-width: 46ch; }

    .note { margin-top: 24px; font-size: 0.95rem; color: var(--inverse-muted); }

    @media (max-width: 720px) {
      .row { grid-template-columns: 1fr; gap: 12px; }
    }
  `,
})
export class TrustComponent {
  protected readonly items = [0, 1, 2];
}
