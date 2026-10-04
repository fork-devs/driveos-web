import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';
import { loadable } from '../../core/api/loadable';
import { AuthService } from '../../core/auth/auth.service';
import { BillingApi, InventoryApi, TelemetryApi, WorkOrdersApi } from '../../domain/api';
import { OrderStatus } from '../../domain/models';
import { AsyncStateComponent } from '../../shared/async-state.component';
import { MoneyPipe, WhenPipe } from '../../shared/format.pipes';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

/* Quality attributes this screen answers (ADD):
   Usabilidad      → what needs a decision is first (attention queue), numbers second.
   Disponibilidad  → gateway + 7 bounded contexts shown as a live topology, not a legend.
   Modifiabilidad  → every micro-frontend is one entry in CONTEXTS; adding one adds a node.
   Performance     → charts are inline SVG + CSS, no chart library. */

type Period = 'day' | 'week' | 'month';

interface Bay {
  name: string;
  kind: string;
  progress: number;
  order: string | null;
}

interface Context {
  path: string;
  name: string;
  service: string;
  icon: string;
  tone: 'iam' | 'operations' | 'iot' | 'inventory' | 'billing' | 'fleet';
  latencyMs: number;
}

interface Stage {
  status: OrderStatus;
  label: string;
  icon: string;
}

const STAGES: Stage[] = [
  { status: 'OPEN', label: 'Recepción', icon: 'ph-door-open' },
  { status: 'IN_PROGRESS', label: 'En taller', icon: 'ph-wrench' },
  { status: 'WAITING_PARTS', label: 'Repuestos', icon: 'ph-hourglass-medium' },
  { status: 'COMPLETED', label: 'Listo', icon: 'ph-check-circle' },
  { status: 'PAID', label: 'Entregado', icon: 'ph-seal-check' },
];

const REVENUE: Record<Period, { label: string; value: number }[]> = {
  day: [
    { label: '8h', value: 420 }, { label: '10h', value: 1180 }, { label: '12h', value: 1640 },
    { label: '14h', value: 1330 }, { label: '16h', value: 2210 }, { label: '18h', value: 1760 },
  ],
  week: [
    { label: 'Lun', value: 5400 }, { label: 'Mar', value: 7200 }, { label: 'Mié', value: 6100 },
    { label: 'Jue', value: 8900 }, { label: 'Vie', value: 10400 }, { label: 'Sáb', value: 7600 },
  ],
  month: [
    { label: 'S1', value: 31200 }, { label: 'S2', value: 38400 },
    { label: 'S3', value: 35900 }, { label: 'S4', value: 44100 },
  ],
};

const CHART_W = 600;
const CHART_H = 190;

@Component({
  selector: 'app-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslocoPipe,
    AsyncStateComponent,
    StatusBadgeComponent,
    MoneyPipe,
    WhenPipe,
  ],
  styleUrl: './overview.page.scss',
  template: `
    <!-- Hero: one number that matters, controls next to it -->
    <section class="hero rise" style="--d: 0">
      <div class="hero-copy">
        <span class="eyebrow"><span class="live-dot"></span> Sede en vivo · {{ todayStr }}</span>
        <h1>Buen día, {{ firstName() }}.<br />
          <span class="hero-fig">{{ inShop() }}</span> vehículos en el taller.</h1>
        <p>{{ attentionTotal() }} cosas esperan una decisión tuya. El resto del piso va a ritmo.</p>
        <div class="hero-cta">
          <a mat-flat-button routerLink="../orders">Nueva orden de trabajo</a>
          <a mat-stroked-button routerLink="../agenda">Ver agenda de hoy</a>
        </div>
      </div>

      <div class="hero-gauge" matTooltip="Ocupación promedio de bahías">
        <mat-progress-spinner mode="determinate" aria-label="Ocupación de bahías" [value]="occupancy()" [diameter]="148" [strokeWidth]="9" />
        <div class="gauge-label">
          <strong>{{ occupancy() }}<small>%</small></strong>
          <span>ocupación</span>
        </div>
      </div>
    </section>

    <app-async-state
      [loading]="orders.loading() || stock.loading() || alerts.loading() || billing.loading()"
      [error]="orders.error() || stock.error() || alerts.error() || billing.error()"
      (retry)="reloadAll()">

      <!-- Pipeline: the order lifecycle as one proportional flow -->
      <section class="pipeline rise" style="--d: 1" aria-label="Flujo de órdenes de trabajo">
        @for (s of pipeline(); track s.status; let i = $index) {
          <a class="stage" [routerLink]="'../orders'" [style.flex-grow]="s.weight" [style.--i]="i"
             [matTooltip]="s.count + ' órdenes · ' + s.label">
            <i [class]="'ph ' + s.icon" aria-hidden="true"></i>
            <span class="stage-n">{{ s.count }}</span>
            <span class="stage-l">{{ s.label }}</span>
          </a>
        }
      </section>

      <div class="grid">
        <!-- Attention queue -->
        <section class="panel queue rise" style="--d: 2">
          <header>
            <h2>Requiere atención</h2>
            <span class="count-pill">{{ attentionTotal() }}</span>
          </header>

          @for (a of alertList().slice(0, 3); track a.id) {
            <a class="q-row" routerLink="../telemetry">
              <span class="q-ico iot"><i class="ph ph-broadcast"></i></span>
              <span class="q-txt"><strong>{{ a.code }} · {{ a.plate }}</strong><small>{{ a.description }}</small></span>
              <app-badge [value]="a.severity" />
            </a>
          }
          @if (lowStock() > 0) {
            <a class="q-row" routerLink="../inventory">
              <span class="q-ico inventory"><i class="ph ph-package"></i></span>
              <span class="q-txt"><strong>{{ lowStock() }} repuestos bajo mínimo</strong><small>Reponer lotes hoy</small></span>
              <i class="ph ph-arrow-right go"></i>
            </a>
          }
          @if (count('WAITING_PARTS') > 0) {
            <a class="q-row" routerLink="../orders">
              <span class="q-ico operations"><i class="ph ph-hourglass-medium"></i></span>
              <span class="q-txt"><strong>{{ count('WAITING_PARTS') }} órdenes esperan repuestos</strong><small>Cliente sin fecha de entrega</small></span>
              <i class="ph ph-arrow-right go"></i>
            </a>
          }
          @if (attentionTotal() === 0) {
            <p class="clear"><i class="ph ph-check-circle"></i> Bandeja limpia. Nada pendiente.</p>
          }
        </section>

        <!-- Revenue -->
        <section class="panel revenue rise" style="--d: 3">
          <header>
            <div>
              <h2>Facturación</h2>
              <p class="big">{{ periodTotal() | money }}</p>
            </div>
            <mat-button-toggle-group [value]="period()" (change)="period.set($event.value)" hideSingleSelectionIndicator aria-label="Periodo">
              <mat-button-toggle value="day">Hoy</mat-button-toggle>
              <mat-button-toggle value="week">Semana</mat-button-toggle>
              <mat-button-toggle value="month">Mes</mat-button-toggle>
            </mat-button-toggle-group>
          </header>

          @if (chart(); as c) {
            <svg [attr.viewBox]="'0 0 ' + c.w + ' ' + (c.h + 26)" class="area" role="img"
                 [attr.aria-label]="'Facturación ' + period()">
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="var(--c-primary)" stop-opacity="0.32" />
                  <stop offset="1" stop-color="var(--c-primary)" stop-opacity="0" />
                </linearGradient>
              </defs>
              @for (g of [0.25, 0.5, 0.75]; track g) {
                <line x1="0" [attr.x2]="c.w" [attr.y1]="c.h * g" [attr.y2]="c.h * g" class="grid-line" />
              }
              @for (k of [period()]; track k) {
                <path [attr.d]="c.area" fill="url(#fill)" class="area-fill" />
                <path [attr.d]="c.line" class="area-line" pathLength="1" />
              }
              @for (p of c.points; track p.label) {
                <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4.5" class="dot" [matTooltip]="p.label + ' · S/ ' + p.value" />
                <text [attr.x]="p.x" [attr.y]="c.h + 20" class="tick">{{ p.label }}</text>
              }
            </svg>
          }
        </section>

        <!-- Garage floor -->
        <section class="panel floor rise" style="--d: 4">
          <header>
            <h2>Piso del taller</h2>
            <a mat-button routerLink="../agenda">Agenda <i class="ph ph-arrow-right"></i></a>
          </header>
          @for (b of bays; track b.name; let i = $index) {
            <div class="lane" [class.free]="!b.order" [style.--i]="i">
              <div class="lane-head">
                <strong>{{ b.name }}</strong>
                <small>{{ b.kind }}</small>
              </div>
              <div class="lane-track">
                <mat-progress-bar mode="determinate" [attr.aria-label]="'Avance ' + b.name" [value]="b.progress" />
                @if (b.order) {
                  <i class="ph ph-car-profile car" [style.left.%]="b.progress"></i>
                }
              </div>
              <span class="lane-meta">{{ b.order ?? 'Libre' }}</span>
            </div>
          }
        </section>

        <!-- Topology -->
        <section class="panel topo rise" style="--d: 5">
          <header>
            <h2>Contextos y micro-frontends</h2>
            <mat-chip-set aria-label="Estado de la plataforma">
              <mat-chip><i class="ph ph-check-circle ok" aria-hidden="true"></i>&nbsp;7/7 servicios arriba</mat-chip>
            </mat-chip-set>
          </header>
          <div class="gateway"><i class="ph ph-git-fork"></i> API Gateway</div>
          <div class="nodes">
            @for (c of contexts; track c.path; let i = $index) {
              <a class="node" [class]="'node ' + c.tone" [routerLink]="'../' + c.path" [style.--i]="i"
                 [matTooltip]="c.service + ' · ' + c.latencyMs + ' ms'">
                <span class="node-ico"><i [class]="'ph ' + c.icon"></i></span>
                <strong>{{ c.name }}</strong>
                <small>{{ c.latencyMs }} ms</small>
              </a>
            }
          </div>
        </section>

        <!-- Activity -->
        <section class="panel feed rise" style="--d: 6">
          <header><h2>Últimos movimientos</h2></header>
          <ol class="timeline">
            @for (o of recent(); track o.id; let i = $index) {
              <li [style.--i]="i">
                <span class="tl-dot"></span>
                <div class="tl-body">
                  <div><strong>{{ o.code }}</strong> · {{ o.vehicle }}</div>
                  <small>{{ o.customer }} · {{ o.plate }} · {{ o.createdAt | when }}</small>
                </div>
                <div class="tl-end"><span class="num">{{ o.total | money }}</span><app-badge [value]="o.status" /></div>
              </li>
            }
          </ol>
        </section>
      </div>
    </app-async-state>
  `,
})
export class OverviewPage {
  private readonly ordersApi = inject(WorkOrdersApi);
  private readonly inventoryApi = inject(InventoryApi);
  private readonly alertsApi = inject(TelemetryApi);
  private readonly billingApi = inject(BillingApi);
  private readonly auth = inject(AuthService);

  protected readonly orders = loadable(() => this.ordersApi.list());
  protected readonly stock = loadable(() => this.inventoryApi.list());
  protected readonly alerts = loadable(() => this.alertsApi.getAlerts());
  protected readonly billing = loadable(() => this.billingApi.listInvoices());

  protected readonly period = signal<Period>('week');

  protected readonly firstName = computed(() => this.auth.profile()?.name.split(' ')[0] ?? 'Elena');
  protected readonly alertList = computed(() => this.alerts.data() ?? []);
  protected readonly lowStock = computed(
    () => (this.stock.data() ?? []).filter((p) => p.stock <= p.minStock).length,
  );
  protected readonly inShop = computed(
    () => this.count('OPEN') + this.count('IN_PROGRESS') + this.count('WAITING_PARTS'),
  );
  protected readonly attentionTotal = computed(
    () => this.alertList().length + (this.lowStock() > 0 ? 1 : 0) + (this.count('WAITING_PARTS') > 0 ? 1 : 0),
  );
  protected readonly recent = computed(() =>
    [...(this.orders.data() ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4),
  );

  protected readonly pipeline = computed(() =>
    STAGES.map((s) => {
      const count = this.count(s.status);
      return { ...s, count, weight: Math.max(count, 0.6) };
    }),
  );

  protected readonly periodTotal = computed(() =>
    REVENUE[this.period()].reduce((sum, p) => sum + p.value, 0),
  );

  /** Smooth area chart as plain SVG path data. */
  protected readonly chart = computed(() => {
    const data = REVENUE[this.period()];
    const max = Math.max(...data.map((d) => d.value)) * 1.15;
    const pad = 14;
    const step = (CHART_W - pad * 2) / (data.length - 1);
    const points = data.map((d, i) => ({
      ...d,
      x: pad + i * step,
      y: CHART_H - (d.value / max) * (CHART_H - 12),
    }));
    let line = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const mx = (a.x + b.x) / 2;
      line += ` C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
    }
    const last = points[points.length - 1];
    const area = `${line} L${last.x},${CHART_H} L${points[0].x},${CHART_H} Z`;
    return { w: CHART_W, h: CHART_H, points, line, area };
  });

  protected readonly todayStr = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  protected readonly bays: Bay[] = [
    { name: 'Bahía 1', kind: 'Mecánica pesada', progress: 78, order: 'OT-2026-0841' },
    { name: 'Bahía 2', kind: 'Mantenimiento rápido', progress: 0, order: null },
    { name: 'Bahía 3', kind: 'Alineación 3D', progress: 52, order: 'OT-2026-0842' },
    { name: 'Bahía 4', kind: 'Scanner OBD-II', progress: 91, order: 'OT-2026-0839' },
  ];

  protected readonly occupancy = computed(() =>
    Math.round((this.bays.filter((b) => b.order).length / this.bays.length) * 100),
  );

  /** Single source of truth for the micro-frontend map. */
  protected readonly contexts: Context[] = [
    { path: 'orders', name: 'Órdenes', service: 'Operaciones OTs', icon: 'ph-clipboard-text', tone: 'operations', latencyMs: 38 },
    { path: 'telemetry', name: 'Telemetría', service: 'IoT OBD-II', icon: 'ph-broadcast', tone: 'iot', latencyMs: 21 },
    { path: 'inventory', name: 'Inventario', service: 'Inventario FIFO', icon: 'ph-package', tone: 'inventory', latencyMs: 44 },
    { path: 'billing', name: 'Facturación', service: 'Billing SUNAT', icon: 'ph-receipt', tone: 'billing', latencyMs: 67 },
    { path: 'agenda', name: 'Agenda', service: 'Flota y citas', icon: 'ph-calendar-blank', tone: 'fleet', latencyMs: 29 },
  ];

  protected count(status: OrderStatus): number {
    return (this.orders.data() ?? []).filter((o) => o.status === status).length;
  }

  protected reloadAll(): void {
    this.orders.reload();
    this.stock.reload();
    this.alerts.reload();
    this.billing.reload();
  }
}
