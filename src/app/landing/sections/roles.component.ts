import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/reveal.directive';

type Role = 'manager' | 'technician';

/** Two-role selector. Motion job: feedback, the panel swaps content when the tab changes. */
@Component({
  selector: 'app-roles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, RevealDirective],
  template: `
    <section id="roles" class="roles">
      <div class="wrap layout">
        <div class="side" appReveal>
          <h2>{{ 'roles.title' | transloco }}</h2>
          <div class="tabs" role="tablist" [attr.aria-label]="'roles.tabsLabel' | transloco" (keydown)="onKey($event)">
            @for (r of roles; track r.id) {
              <button
                type="button"
                role="tab"
                [id]="'tab-' + r.id"
                [attr.aria-selected]="role() === r.id"
                [attr.aria-controls]="'panel-' + r.id"
                [attr.tabindex]="role() === r.id ? 0 : -1"
                (click)="role.set(r.id)"
              >
                <i class="ph" [class]="'ph ' + r.icon" aria-hidden="true"></i>
                {{ 'roles.' + r.id + '.tab' | transloco }}
              </button>
            }
          </div>
        </div>

        @for (r of roles; track r.id) {
          @if (role() === r.id) {
            <div class="panel" role="tabpanel" [id]="'panel-' + r.id" [attr.aria-labelledby]="'tab-' + r.id">
              <p class="lead">{{ 'roles.' + r.id + '.lead' | transloco }}</p>
              <ul>
                @for (n of [0, 1, 2]; track n) {
                  <li>
                    <i class="ph ph-check-circle" aria-hidden="true"></i>
                    {{ 'roles.' + r.id + '.items.' + n | transloco }}
                  </li>
                }
              </ul>
            </div>
          }
        }
      </div>
    </section>
  `,
  styles: `
    .roles { padding-block: clamp(64px, 10vw, 140px); }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
      gap: clamp(24px, 5vw, 80px);
      align-items: stretch;
    }

    h2 {
      font-size: clamp(2.2rem, 4.6vw, 3.8rem);
      font-weight: 800;
      letter-spacing: -0.04em;
      margin-bottom: 32px;
    }

    .tabs { display: grid; gap: 10px; }

    .tabs button {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 56px;
      padding: 0 22px;
      border: 1.5px solid var(--line);
      border-radius: var(--r-pill);
      background: transparent;
      text-align: left;
      font-weight: 650;
      font-size: 1.05rem;
      transition:
        background-color 0.25s var(--ease-out),
        border-color 0.25s var(--ease-out),
        color 0.25s var(--ease-out);
    }

    .tabs button i { font-size: 1.4rem; }
    .tabs button:hover { border-color: var(--fg); }

    .tabs button[aria-selected='true'] {
      background: var(--c-primary);
      border-color: var(--c-primary);
      color: var(--c-white);
    }

    .panel {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 32px;
      min-height: 340px;
      padding: clamp(28px, 4vw, 56px);
      border: 1px solid var(--line);
      border-radius: var(--r-card);
      background:
        linear-gradient(90deg, var(--card) 62%, transparent 100%),
        url('/brand/pattern-light.png') right center / 280px auto;
      background-color: var(--card);
      animation: swap 0.5s var(--ease-out);
    }

    @keyframes swap { from { opacity: 0; transform: translateY(12px); } }

    .lead { font-size: clamp(1.7rem, 3vw, 2.6rem); font-weight: 750; letter-spacing: -0.035em; line-height: 1.1; max-width: 18ch; }

    li { display: flex; align-items: center; gap: 12px; font-size: 1.1rem; padding-block: 6px; }
    li i { font-size: 1.4rem; color: var(--c-primary); flex: none; }

    ul { display: grid; gap: 4px; }

    @media (max-width: 860px) {
      .layout { grid-template-columns: 1fr; }
      .panel { min-height: 0; }
    }
  `,
})
export class RolesComponent {
  protected readonly roles: { id: Role; icon: string }[] = [
    { id: 'manager', icon: 'ph-chart-line-up' },
    { id: 'technician', icon: 'ph-wrench' },
  ];
  protected readonly role = signal<Role>('manager');

  protected onKey(e: KeyboardEvent): void {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next: Role = this.role() === 'manager' ? 'technician' : 'manager';
    this.role.set(next);
    queueMicrotask(() => document.getElementById('tab-' + next)?.focus());
  }
}
