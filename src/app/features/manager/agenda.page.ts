import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { TranslocoPipe } from '@jsverse/transloco';
import { loadable } from '../../core/api/loadable';
import { AppointmentsApi } from '../../domain/api';
import { AsyncStateComponent } from '../../shared/async-state.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

/**
 * Fleet & Workshop Agenda Bounded Context
 * Organizes customer appointments, services, and bay assignment.
 */
@Component({
  selector: 'app-agenda',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AsyncStateComponent, StatusBadgeComponent, MatCardModule, MatChipsModule, TranslocoPipe],
  styleUrl: '../page.scss',
  styles: `
    .list { display: grid; gap: 12px; }

    .slot-card {
      display: grid;
      grid-template-columns: 140px 180px minmax(0, 1fr) 140px;
      align-items: center;
      gap: 18px;
      padding: 18px 20px;
      border-radius: var(--r-card);
    }

    .time-badge {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--link);
    }

    .plate-badge {
      font-family: monospace;
      font-weight: 800;
      padding: 2px 6px;
      background: color-mix(in srgb, var(--fg) 8%, transparent);
      border-radius: 4px;
      border: 1px solid var(--line);
      font-size: 0.85rem;
    }

    @media (max-width: 860px) {
      .slot-card { grid-template-columns: 1fr auto; row-gap: 8px; }
      .slot-card > :nth-child(3) { grid-column: 1 / -1; }
    }
  `,
  template: `
    <div class="head">
      <h1 style="margin-top: 6px;">{{ 'app.nav.agenda' | transloco }}</h1>
      <p>Programación de ingresos vehiculares y asignación de elevadores y puestos de trabajo.</p>
    </div>

    <app-async-state [loading]="items.loading()"
                     [error]="items.error()"
                     [empty]="(items.data() ?? []).length === 0"
                     emptyKey="app.agenda.empty"
                     (retry)="items.reload()">
      <div class="list">
        @for (a of items.data(); track a.id) {
          <mat-card appearance="outlined" class="slot-card">
            <div class="time-badge">
              <i class="ph ph-clock"></i> {{ a.time }}
            </div>

            <div>
              <mat-chip-set aria-label="Bahía asignada">
                <mat-chip><i class="ph ph-wrench" aria-hidden="true"></i>&nbsp;{{ a.bayNumber }}</mat-chip>
              </mat-chip-set>
            </div>

            <div>
              <strong style="font-size: 0.98rem;">{{ a.service }}</strong>
              <div style="margin-top: 4px; font-size: 0.85rem; color: var(--muted);">
                <span class="plate-badge">{{ a.plate }}</span> • {{ a.customer }}
                {{ a.technicianAssigned ? ' • Mecánico: ' + a.technicianAssigned : '' }}
              </div>
            </div>

            <div style="text-align: right;">
              <app-badge [value]="a.status" />
            </div>
          </mat-card>
        }
      </div>
    </app-async-state>
  `,
})
export class AgendaPage {
  private readonly api = inject(AppointmentsApi);
  protected readonly items = loadable(() => this.api.list());
}
