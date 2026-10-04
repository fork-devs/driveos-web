import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/reveal.directive';

interface Cell {
  key: 'telemetry' | 'evidence' | 'fifo' | 'sunat' | 'offline';
  icon: string;
}

/** Bento with exactly five cells, one per product capability. Backgrounds vary on purpose. */
@Component({
  selector: 'app-features',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, RevealDirective],
  template: `
    <section id="features" class="features">
      <div class="wrap">
        <h2 appReveal>{{ 'features.title' | transloco }}</h2>

        <div class="bento">
          @for (c of cells; track c.key; let i = $index) {
            <article class="cell" [class]="'cell c-' + c.key" [appReveal]="i">
              <i class="ph" [class]="'ph ' + c.icon" aria-hidden="true"></i>
              <div class="body">
                <h3>{{ 'features.' + c.key + '.title' | transloco }}</h3>
                <p>{{ 'features.' + c.key + '.text' | transloco }}</p>
              </div>
            </article>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .features { padding-block: clamp(80px, 12vw, 160px); }

    h2 {
      max-width: 16ch;
      font-size: clamp(2.2rem, 5vw, 4.2rem);
      font-weight: 800;
      letter-spacing: -0.04em;
      margin-bottom: clamp(32px, 5vw, 64px);
    }

    .bento {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      grid-auto-rows: minmax(230px, auto);
      gap: 16px;
    }

    .cell {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 32px;
      padding: clamp(24px, 3vw, 36px);
      border-radius: var(--r-card);
      overflow: hidden;
      isolation: isolate;
    }

    .cell > i { font-size: 2.2rem; }

    h3 { font-size: clamp(1.4rem, 2vw, 1.9rem); font-weight: 700; letter-spacing: -0.03em; margin-bottom: 8px; color: inherit; }

    .body { max-width: 40ch; }

    /* Layout: 7+5 / 5 stacked / 5+7. Every cell is filled. */
    .c-telemetry { grid-column: 1 / 8; grid-row: 1 / 3; background: var(--c-primary); color: var(--c-white); }
    .c-evidence { grid-column: 8 / 13; background: var(--inverse-bg); color: var(--inverse-fg); }
    .c-fifo { grid-column: 8 / 13; background: var(--card); border: 1px solid var(--line); }
    .c-sunat { grid-column: 1 / 6; background: var(--c-primary-soft); color: var(--c-black); }
    .c-offline { grid-column: 6 / 13; background: var(--c-primary-dark); color: var(--c-white); }

    .c-telemetry::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      background: url('/brand/pattern-blue.png') center / 300px auto repeat;
      opacity: 0.55;
      -webkit-mask-image: linear-gradient(200deg, #000 5%, transparent 65%);
      mask-image: linear-gradient(200deg, #000 5%, transparent 65%);
    }

    .c-telemetry > i { font-size: 3.4rem; }
    .c-telemetry h3 { font-size: clamp(1.8rem, 3.2vw, 2.8rem); }
    .c-telemetry p { font-size: 1.15rem; }
    .c-fifo > i { color: var(--c-primary); }
    .c-fifo p { color: var(--muted); }
    .c-evidence p { color: var(--inverse-muted); }
    .c-offline p { color: #c9d6f5; }

    @media (max-width: 860px) {
      .bento { grid-template-columns: 1fr; grid-auto-rows: auto; }
      .cell { grid-column: 1 / -1 !important; grid-row: auto !important; min-height: 210px; }
    }
  `,
})
export class FeaturesComponent {
  protected readonly cells: Cell[] = [
    { key: 'telemetry', icon: 'ph-gauge' },
    { key: 'evidence', icon: 'ph-camera' },
    { key: 'fifo', icon: 'ph-package' },
    { key: 'sunat', icon: 'ph-receipt' },
    { key: 'offline', icon: 'ph-wifi-slash' },
  ];
}
