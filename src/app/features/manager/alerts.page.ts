import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { loadable } from '../../core/api/loadable';
import { TelemetryApi } from '../../domain/api';
import { DtcAlert, Severity } from '../../domain/models';
import { AsyncStateComponent } from '../../shared/async-state.component';
import { WhenPipe } from '../../shared/format.pipes';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

const RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2 };
const W = 240;
const H = 56;

@Component({
  selector: 'app-alerts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, AsyncStateComponent, StatusBadgeComponent, WhenPipe],
  styleUrl: '../page.scss',
  styles: `
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .alert { display: grid; gap: 14px; }
    .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .code { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.03em; }
    .meta { color: var(--muted); font-size: 0.92rem; }
    .trend { display: grid; gap: 6px; }
    .trend svg { width: 100%; height: 56px; overflow: visible; }
    .line { fill: none; stroke: var(--c-primary); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .dot { fill: var(--c-primary); }
    .critical .line { stroke: var(--c-red); }
    .critical .dot { fill: var(--c-red); }
    .trend small { display: flex; justify-content: space-between; color: var(--muted); }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
  `,
  template: `
    <div class="head">
      <h1>{{ 'app.alerts.title' | transloco }}</h1>
      <p>{{ 'app.alerts.sub' | transloco }}</p>
    </div>

    <app-async-state [loading]="alerts.loading()" [error]="alerts.error()" [empty]="items().length === 0"
      emptyKey="app.alerts.empty" (retry)="alerts.reload()">
      <div class="grid">
        @for (a of items(); track a.id) {
          <article class="card alert" [class.critical]="a.severity === 'critical'">
            <div class="top">
              <div>
                <p class="code">{{ a.code }}</p>
                <p>{{ a.description }}</p>
              </div>
              <app-badge [value]="a.severity" />
            </div>
            <p class="meta"><strong>{{ a.plate }}</strong>, {{ a.vehicle }}, {{ a.raisedAt | when }}</p>

            <div class="trend">
              <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" role="img"
                [attr.aria-label]="'app.alerts.trend' | transloco: { from: first(a), to: last(a) }" preserveAspectRatio="none">
                <polyline class="line" [attr.points]="points(a)" vector-effect="non-scaling-stroke" />
              </svg>
              <small class="num">
                <span>{{ first(a) }} °C</span>
                <span>{{ 'app.alerts.coolant' | transloco }}</span>
                <span>{{ last(a) }} °C</span>
              </small>
            </div>
          </article>
        }
      </div>
    </app-async-state>
  `,
})
export class AlertsPage {
  private readonly api = inject(TelemetryApi);

  protected readonly w = W;
  protected readonly h = H;
  protected readonly alerts = loadable(() => this.api.getAlerts());
  protected readonly items = computed(() =>
    [...(this.alerts.data() ?? [])].sort((a, b) => RANK[a.severity] - RANK[b.severity]),
  );

  protected first(a: DtcAlert): number {
    return a.readings[0];
  }

  protected last(a: DtcAlert): number {
    return a.readings[a.readings.length - 1];
  }

  protected points(a: DtcAlert): string {
    const lo = Math.min(...a.readings);
    const hi = Math.max(...a.readings);
    const span = hi - lo || 1;
    const pad = 4;
    return a.readings
      .map((v, i) => {
        const x = (i / (a.readings.length - 1)) * W;
        const y = pad + (1 - (v - lo) / span) * (H - 2 * pad);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }
}
