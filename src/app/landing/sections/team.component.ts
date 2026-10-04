import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-team',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, RevealDirective],
  template: `
    <section class="team">
      <div class="wrap">
        <div class="head" appReveal>
          <h2>{{ 'team.title' | transloco }}</h2>
          <p>{{ 'team.sub' | transloco }}</p>
        </div>

        <ul class="members">
          @for (n of members; track n) {
            <li [appReveal]="n">
              <h3>{{ 'team.members.' + n + '.name' | transloco }}</h3>
              <p>{{ 'team.members.' + n + '.role' | transloco }}</p>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: `
    .team { padding-block: clamp(64px, 9vw, 120px) clamp(80px, 12vw, 160px); }

    .head { display: grid; gap: 12px; margin-bottom: clamp(32px, 5vw, 56px); }

    h2 { font-size: clamp(2rem, 4vw, 3.2rem); font-weight: 800; letter-spacing: -0.04em; }
    .head p { color: var(--muted); max-width: 46ch; }

    .members {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0 32px;
    }

    li { padding-block: 22px; border-top: 1px solid var(--line); }

    h3 { font-size: 1.2rem; font-weight: 700; letter-spacing: -0.02em; }
    li p { color: var(--muted); font-size: 0.98rem; margin-top: 4px; }

    @media (max-width: 900px) {
      .members { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 560px) {
      .members { grid-template-columns: 1fr; }
    }
  `,
})
export class TeamComponent {
  protected readonly members = [0, 1, 2, 3, 4];
}
