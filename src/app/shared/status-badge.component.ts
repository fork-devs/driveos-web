import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

type Tone = 'blue' | 'amber' | 'green' | 'solid' | 'red' | 'solid-red';

const TONES: Record<string, { tone: Tone; icon: string }> = {
  OPEN: { tone: 'blue', icon: 'ph-circle-dashed' },
  PENDING: { tone: 'blue', icon: 'ph-circle-dashed' },
  CONFIRMED: { tone: 'blue', icon: 'ph-calendar-check' },
  IN_PROGRESS: { tone: 'amber', icon: 'ph-wrench' },
  WAITING_PARTS: { tone: 'amber', icon: 'ph-hourglass-medium' },
  COMPLETED: { tone: 'green', icon: 'ph-check' },
  DONE: { tone: 'green', icon: 'ph-check' },
  PAID: { tone: 'solid', icon: 'ph-seal-check' },
  medium: { tone: 'blue', icon: 'ph-info' },
  high: { tone: 'amber', icon: 'ph-warning' },
  critical: { tone: 'solid-red', icon: 'ph-warning-octagon' },
  low: { tone: 'amber', icon: 'ph-arrow-down' },
  ok: { tone: 'green', icon: 'ph-check' },
};

/** Status or severity as icon plus text, never color alone. */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    <span class="badge" [class]="'badge ' + view().tone">
      <i [class]="'ph ' + view().icon" aria-hidden="true"></i>
      {{ 'app.status.' + value() | transloco }}
    </span>
  `,
  styles: `
    :host { display: inline-flex; }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px 4px 10px;
      border-radius: var(--r-pill);
      font-size: 0.82rem;
      font-weight: 650;
      white-space: nowrap;
    }

    .blue { background: #e6f1ff; color: #03449c; }
    .amber { background: #fff1d6; color: #7a4200; }
    .green { background: #d9f7e5; color: #075a2a; }
    .red { background: #fde3e5; color: #8f0b17; }
    .solid { background: var(--c-primary); color: var(--c-white); }
    .solid-red { background: var(--c-red); color: var(--c-white); }

    @media (prefers-color-scheme: dark) {
      .blue { background: rgb(105 177 255 / 0.16); color: #9ccbff; }
      .amber { background: rgb(247 179 43 / 0.16); color: #f7c76a; }
      .green { background: rgb(0 215 86 / 0.14); color: #5be391; }
      .red { background: rgb(216 18 34 / 0.2); color: #ff8791; }
    }
  `,
})
export class StatusBadgeComponent {
  readonly value = input.required<string>();
  protected readonly view = computed(() => TONES[this.value()] ?? { tone: 'blue' as Tone, icon: 'ph-info' });
}
