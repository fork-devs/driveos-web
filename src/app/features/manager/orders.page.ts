import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslocoPipe } from '@jsverse/transloco';
import { loadable } from '../../core/api/loadable';
import { WorkOrdersApi } from '../../domain/api';
import { ORDER_STATUSES, OrderStatus, WorkOrder } from '../../domain/models';
import { AsyncStateComponent } from '../../shared/async-state.component';
import { MoneyPipe, WhenPipe } from '../../shared/format.pipes';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

/**
 * Operations Bounded Context: Work Orders (OTs).
 * Material accordion for the order list, chip listbox for status, outline field for search.
 */
@Component({
  selector: 'app-orders',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    AsyncStateComponent,
    StatusBadgeComponent,
    MoneyPipe,
    WhenPipe,
    MatButtonModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  styleUrl: '../page.scss',
  styles: `
    .toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
    .search {
      width: min(100%, 320px);
      --mat-sys-corner-extra-small: 24px;
      --mat-form-field-container-height: 46px;
      --mat-form-field-container-vertical-padding: 11px;
    }

    .order {
      margin-bottom: 12px;
      border: 1px solid var(--line);
      border-radius: var(--r-card) !important;
      box-shadow: none !important;
      transition: border-color 0.25s var(--ease-out);
    }
    .order.mat-expanded { border-color: var(--c-primary); box-shadow: var(--shadow-card) !important; }

    .row {
      display: grid;
      width: 100%;
      align-items: center;
      gap: 16px;
      grid-template-columns: 140px minmax(0, 1.8fr) minmax(0, 1.4fr) 120px 150px;
    }
    .code { font-family: ui-monospace, monospace; font-size: 1rem; }
    small.sub { display: block; color: var(--muted); }
    .plate-badge {
      display: inline-block;
      padding: 3px 8px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: color-mix(in srgb, var(--fg) 8%, transparent);
      font-family: ui-monospace, monospace;
      font-weight: 800;
      font-size: 0.95rem;
    }
    .total { font-weight: 800; font-size: 1.1rem; }

    .detail { display: grid; gap: 18px; padding-top: 4px; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      padding: 12px 16px;
      border-radius: var(--r-field);
      background: var(--card-nested);
      font-size: 0.88rem;
    }
    .meta-grid span { color: var(--muted); margin-right: 4px; }
    .tasks { display: grid; gap: 10px; margin-top: 8px; }
    .task {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: 1px solid var(--line);
      border-radius: var(--r-field);
      background: var(--card-nested);
    }
    .task small { display: block; color: var(--muted); }
    .action-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: 0.88rem; color: var(--muted); }

    @media (max-width: 920px) {
      .row { grid-template-columns: 1fr auto; row-gap: 8px; }
      .row > :nth-child(3), .row > :nth-child(4) { grid-column: 1 / -1; }
    }
  `,
  template: `
    <div class="head">
      <span class="bc-badge operations"><i class="ph ph-wrench"></i> Operaciones Bounded Context</span>
      <h1 style="margin-top: 6px;">Órdenes de Trabajo (OT)</h1>
      <p>Control de diagnóstico vehicular, repuestos asignados y avance de tareas mecánicas.</p>
    </div>

    <div class="toolbar">
      <mat-chip-listbox aria-label="Filtrar por estado" [value]="filter()" (change)="filter.set($event.value ?? null)">
        <mat-chip-option [value]="null">Todas ({{ orders.data()?.length ?? 0 }})</mat-chip-option>
        @for (s of statuses; track s) {
          <mat-chip-option [value]="s">{{ 'app.status.' + s | transloco }}</mat-chip-option>
        }
      </mat-chip-listbox>

      <mat-form-field class="search" appearance="outline" subscriptSizing="dynamic">
        <i matPrefix class="ph ph-magnifying-glass" aria-hidden="true" style="margin: 0 6px 0 14px;"></i>
        <input matInput type="search" placeholder="Buscar placa, cliente u orden…" aria-label="Buscar órdenes"
               [ngModel]="query()" (ngModelChange)="query.set($event)" />
        @if (query()) {
          <button matSuffix mat-icon-button type="button" (click)="query.set('')" aria-label="Limpiar búsqueda">
            <i class="ph ph-x-circle"></i>
          </button>
        }
      </mat-form-field>
    </div>

    <app-async-state [loading]="orders.loading()"
                     [error]="orders.error()"
                     [empty]="visible().length === 0"
                     emptyKey="app.orders.empty"
                     (retry)="orders.reload()">
      <mat-accordion>
        @for (o of visible(); track o.id) {
          <mat-expansion-panel class="order" [expanded]="openId() === o.id"
                               (opened)="openId.set(o.id)" (closed)="close(o.id)">
            <mat-expansion-panel-header collapsedHeight="84px" expandedHeight="84px">
              <div class="row">
                <div>
                  <strong class="code">{{ o.code }}</strong>
                  <small class="sub">{{ o.createdAt | when }}</small>
                </div>
                <div>
                  <span class="plate-badge">{{ o.plate }}</span>
                  <small class="sub">{{ o.vehicle }}</small>
                </div>
                <div>
                  <strong>{{ o.customer }}</strong>
                  <small class="sub">{{ o.customerPhone ?? 'Sin teléfono' }}</small>
                </div>
                <div class="total">{{ o.total | money }}</div>
                <div><app-badge [value]="o.status" /></div>
              </div>
            </mat-expansion-panel-header>

            <div class="detail">
              <div class="meta-grid">
                <div><span>Kilometraje de ingreso:</span> <strong>{{ o.mileageKm ? (o.mileageKm | number) + ' km' : 'No registrado' }}</strong></div>
                <div><span>Checklist recepción:</span>
                  <strong>{{ o.initialChecklist?.fuelLevel ?? 'Normal' }} {{ o.initialChecklist?.scratchesNoted ? '• Con marcas' : '' }}</strong></div>
                <div><span>Entrega estimada:</span> <strong>{{ o.estimatedDelivery ? (o.estimatedDelivery | when) : 'Pendiente' }}</strong></div>
              </div>

              <div>
                <h4 style="font-size: 0.95rem;"><i class="ph ph-list-checks"></i> Tareas y repuestos de esta orden</h4>
                <div class="tasks">
                  @for (t of o.tasks; track t.id) {
                    <div class="task">
                      <div>
                        <strong>{{ t.title }}</strong>
                        <small>Mecánico: <strong>{{ t.assignee }}</strong>{{ t.estimatedMinutes ? ' • Est: ' + t.estimatedMinutes + ' min' : '' }}</small>
                        @if (t.parts.length > 0) {
                          <small><i class="ph ph-package"></i> Repuestos: {{ partsText(t) }}</small>
                        }
                      </div>
                      <app-badge [value]="t.status" />
                    </div>
                  }
                </div>
              </div>

              @if (busyId() === o.id) { <mat-progress-bar mode="indeterminate" /> }

              <div class="action-bar">
                <span>Subtotal: <strong>{{ (o.subtotal ?? (o.total / 1.18)) | money }}</strong> • IGV (18%): <strong>{{ (o.tax ?? (o.total - (o.total / 1.18))) | money }}</strong></span>
                @if (next(o.status); as n) {
                  <button mat-flat-button type="button" [disabled]="busyId() === o.id" (click)="advance(o, n)">
                    Avanzar a {{ 'app.status.' + n | transloco }}
                  </button>
                }
              </div>
            </div>
          </mat-expansion-panel>
        }
      </mat-accordion>
    </app-async-state>
  `,
})
export class OrdersPage {
  private readonly api = inject(WorkOrdersApi);

  protected readonly orders = loadable(() => this.api.list());
  protected readonly statuses = ORDER_STATUSES;
  protected readonly filter = signal<OrderStatus | null>(null);
  protected readonly query = signal<string>('');
  protected readonly openId = signal<string | null>('wo-101');
  protected readonly busyId = signal<string | null>(null);

  protected readonly visible = computed(() => {
    const f = this.filter();
    const q = this.query().toLowerCase().trim();
    let all = [...(this.orders.data() ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (f) {
      all = all.filter((o) => o.status === f);
    }
    if (q) {
      all = all.filter(
        (o) =>
          o.code.toLowerCase().includes(q) ||
          o.plate.toLowerCase().includes(q) ||
          o.customer.toLowerCase().includes(q) ||
          o.vehicle.toLowerCase().includes(q),
      );
    }
    return all;
  });

  /** Only clear when the panel being closed is still the open one (opening another also closes this). */
  protected close(id: string): void {
    this.openId.update((cur) => (cur === id ? null : cur));
  }

  protected next(status: OrderStatus): OrderStatus | null {
    return ORDER_STATUSES[ORDER_STATUSES.indexOf(status) + 1] ?? null;
  }

  protected partsText(task: WorkOrder['tasks'][number]): string {
    return task.parts.map((p) => `${p.qty}x ${p.name}`).join(', ');
  }

  protected advance(order: WorkOrder, to: OrderStatus): void {
    this.busyId.set(order.id);
    this.api.changeStatus(order.id, to).subscribe({
      next: () => {
        this.busyId.set(null);
        this.orders.reload();
      },
      error: () => {
        this.busyId.set(null);
        this.orders.reload();
      },
    });
  }
}
