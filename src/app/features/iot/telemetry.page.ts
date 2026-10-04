import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslocoPipe } from '@jsverse/transloco';
import { Vehicle3dViewerComponent } from '../../shared/vehicle-3d-viewer.component';
import { loadable } from '../../core/api/loadable';
import { TelemetryApi } from '../../domain/api';
import { DtcAlert, TelemetrySnapshot } from '../../domain/models';
import { AsyncStateComponent } from '../../shared/async-state.component';
import { WhenPipe } from '../../shared/format.pipes';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

interface Gauge {
  icon: string;
  title: string;
  value: string;
  unit: string;
  pct: number;
  state: 'ok' | 'warn' | 'danger';
}

@Component({
  selector: 'app-telemetry',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AsyncStateComponent, StatusBadgeComponent, WhenPipe, MatButtonModule, MatCardModule, MatProgressBarModule, TranslocoPipe, Vehicle3dViewerComponent],
  styleUrl: '../page.scss',
  styles: `
    .telemetry-grid {
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr);
      gap: 20px;
      margin-top: 16px;
    }

    .vehicle-card {
      padding: 16px;
      border-radius: var(--r-card);
      cursor: pointer;
      transition: border-color 0.2s var(--ease-out), transform 0.2s var(--ease-out), background-color 0.2s;
      margin-bottom: 12px;

      &:hover { border-color: var(--c-primary); transform: translateY(-2px); }

      &.selected {
        border-color: var(--c-primary);
        background: color-mix(in srgb, var(--c-primary) 6%, var(--card));
        box-shadow: 0 0 0 1.5px var(--c-primary);
      }
    }

    .vh-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .plate-badge {
      font-family: monospace;
      font-weight: 800;
      font-size: 0.95rem;
      padding: 3px 8px;
      background: color-mix(in srgb, var(--fg) 10%, transparent);
      border-radius: 6px;
      border: 1px solid var(--line);
    }

    /* Fixed Contrast 1: Status Dot */
    .status-dot {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      font-weight: 600;

      &.online { color: var(--fg); }
      &.online::before { background-color: #10b981; box-shadow: 0 0 6px #10b981; }
      &.offline { color: var(--muted); }
      &.offline::before { background-color: var(--muted); }

      &::before {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
    }

    .vh-model { font-weight: 650; font-size: 0.95rem; margin-bottom: 4px; }
    .vh-meta { font-size: 0.82rem; color: var(--muted); }

    .live-dashboard {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .cluster-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 24px;
      background: linear-gradient(135deg, color-mix(in srgb, var(--c-primary-dark) 40%, var(--card)), var(--card));
      border: 1px solid var(--line);
      border-radius: var(--r-card);
    }

    .gauges-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .gauge-card {
      padding: 20px 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: var(--r-card);
      position: relative;
      overflow: hidden;

      .gauge-icon {
        font-size: 1.6rem;
        color: var(--c-primary);
      }

      .gauge-value {
        font-size: 2.2rem;
        font-weight: 800;
        letter-spacing: -0.04em;
        line-height: 1;
        color: var(--fg);
      }

      .gauge-unit {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--muted);
      }

      .gauge-title {
        font-size: 0.85rem;
        color: var(--muted);
        font-weight: 650;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      mat-progress-bar { margin-top: 6px; border-radius: var(--r-pill); }
      
      /* Fixed Contrast 2 & 3: Warn and Danger colors ensuring WCAG contrast */
      &.warn .gauge-value { color: #d97706; } /* High contrast Amber */
      &.danger .gauge-value { color: #dc2626; } /* High contrast Red */
    }

    .dtc-section { padding: 20px; border-radius: var(--r-card); }

    /* Fixed Contrast 4: DTC Items */
    .dtc-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 14px;
      margin-top: 10px;
      border-radius: var(--r-field);
      background: rgba(220, 38, 38, 0.06);
      border: 1px solid rgba(220, 38, 38, 0.25);

      .dtc-code {
        font-family: monospace;
        font-weight: 800;
        font-size: 1.1rem;
        color: var(--c-red-text); /* WCAG AA red for text, per theme */
      }

      .dtc-desc {
        font-weight: 600;
        font-size: 0.92rem;
        margin-top: 2px;
        color: var(--fg);
      }

      .dtc-action {
        font-size: 0.84rem;
        color: var(--muted);
        margin-top: 6px;
      }
    }

    button[mat-stroked-button] { --mat-button-outlined-label-text-color: var(--link); }

    @media (max-width: 960px) {
      .telemetry-grid { grid-template-columns: 1fr; }
    }
  `,
  template: `
    <div class="head">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 style="margin-top: 6px;">{{ 'app.nav.alerts' | transloco }}</h1>
          <p>Monitoreo vehicular en tiempo real y lectura de códigos de falla DTC.</p>
        </div>
        <button mat-stroked-button type="button" (click)="simulatePulse()">
          <i class="ph ph-lightning" aria-hidden="true"></i> Simular pulso de telemetría
        </button>
      </div>
    </div>

    <app-async-state [loading]="vehicles.loading() || alerts.loading()"
                     [error]="vehicles.error() || alerts.error()"
                     (retry)="reloadAll()">
      <div class="telemetry-grid">
        <!-- Lista de Vehículos Conectados -->
        <div class="vehicles-col">
          <h3 style="margin-bottom: 12px; font-size: 1.05rem;">Vehículos con Dongle OBD-II</h3>
          @for (v of vehicleList(); track v.vehicleId) {
            <mat-card appearance="outlined" class="vehicle-card" role="button" tabindex="0"
                      [class.selected]="selectedVehicle()?.vehicleId === v.vehicleId"
                      [attr.aria-pressed]="selectedVehicle()?.vehicleId === v.vehicleId"
                      (click)="selectVehicle(v)" (keydown.enter)="selectVehicle(v)"
                      (keydown.space)="selectVehicle(v); $event.preventDefault()">
              <div class="vh-header">
                <span class="plate-badge">{{ v.plate }}</span>
                <span class="status-dot" [class.online]="v.connected" [class.offline]="!v.connected">
                  {{ v.connected ? 'Online' : 'Desconectado' }}
                </span>
              </div>
              <div class="vh-model">{{ v.vehicleModel }}</div>
              <div class="vh-meta">
                <span>{{ v.driverName }}</span> • <span>{{ v.lastPing }}</span>
              </div>
              @if (v.activeDtcs.length > 0) {
                <div style="margin-top: 8px;">
                  <app-badge value="critical"></app-badge> <span style="font-size: 0.8rem; font-weight: 600; margin-left: 4px; color: var(--c-red-text);">{{ v.activeDtcs.length }} DTC</span>
                </div>
              }
            </mat-card>
          }
        </div>

        <!-- Tablero de Instrumentos en Vivo -->
        <div class="live-dashboard">
          @if (selectedVehicle(); as cur) {
            <mat-card appearance="outlined" class="cluster-banner" style="display: grid; grid-template-columns: 1fr 280px; gap: 20px; align-items: center; padding: 20px; padding-right: 10px;">
              <div>
                <span class="plate-badge" style="font-size: 1.1rem; padding: 4px 10px;">{{ cur.plate }}</span>
                <h2 style="font-size: 1.4rem; margin-top: 6px;">{{ cur.vehicleModel }}</h2>
                <p style="color: var(--muted); font-size: 0.88rem;">Dongle OBD: <strong>{{ cur.obdSerial }}</strong> • Conductor: {{ cur.driverName }}</p>
                <div style="margin-top: 12px; display: flex; gap: 12px; align-items: center;">
                  <app-badge [value]="cur.activeDtcs.length > 0 ? 'critical' : 'ok'" />
                  <span style="font-size: 0.8rem; color: var(--muted);">{{ cur.lastPing }}</span>
                </div>
              </div>
              <app-vehicle-3d-viewer [vehicle]="cur.vehicleModel" [status]="cur.activeDtcs.length > 0 ? 'critical' : 'ok'" />
            </mat-card>

            <!-- Fila de Relojes / Tacómetro / Indicadores -->
            <div class="gauges-row">
              @for (g of gauges(); track g.title) {
                <mat-card appearance="outlined" class="gauge-card" [class.warn]="g.state === 'warn'" [class.danger]="g.state === 'danger'">
                  <i [class]="'ph gauge-icon ' + g.icon" aria-hidden="true"></i>
                  <div class="gauge-value">{{ g.value }}</div>
                  <div class="gauge-unit">{{ g.unit }}</div>
                  <div class="gauge-title">{{ g.title }}</div>
                  <mat-progress-bar mode="determinate" [value]="g.pct" [attr.aria-label]="g.title" />
                </mat-card>
              }
            </div>

            <!-- Sección de Diagnóstico DTC -->
            <mat-card appearance="outlined" class="dtc-section">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3><i class="ph ph-warning-circle" style="color: var(--c-red);"></i> Códigos de Falla DTC Detectados</h3>
                <span style="font-size: 0.85rem; color: var(--muted);">Estándar SAE J2012 / OBD-II</span>
              </div>

              @if (matchingAlerts().length > 0) {
                @for (a of matchingAlerts(); track a.id) {
                  <div class="dtc-item">
                    <div>
                      <div class="dtc-code">{{ a.code }} - {{ a.system }}</div>
                      <div class="dtc-desc">{{ a.description }}</div>
                      <div class="dtc-action"><i class="ph ph-lightbulb"></i> <strong>Acción Sugerida:</strong> {{ a.suggestedAction }}</div>
                      <div style="margin-top: 6px; font-size: 0.78rem; color: var(--muted);">
                        Registrado: {{ a.raisedAt | when }} • Curva Temperatura: {{ a.readings.join('°C → ') }}°C
                      </div>
                    </div>
                    <app-badge [value]="a.severity" />
                  </div>
                }
              } @else {
                <div style="padding: 24px; text-align: center; color: var(--muted);">
                  <i class="ph ph-check-circle" style="font-size: 2rem; color: var(--c-green); display: block; margin-bottom: 6px;"></i>
                  Sin códigos de falla activos en la ECU de este vehículo.
                </div>
              }
            </mat-card>
          }
        </div>
      </div>
    </app-async-state>
  `,
})
export class TelemetryPage {
  private readonly telemetryApi = inject(TelemetryApi);

  protected readonly vehicles = loadable(() => this.telemetryApi.listVehicles());
  protected readonly alerts = loadable(() => this.telemetryApi.getAlerts());

  protected readonly vehicleList = computed(() => this.vehicles.data() ?? []);
  /** Vehicle the user clicked, or a simulated pulse. Until then the first loaded vehicle is shown. */
  private readonly picked = signal<TelemetrySnapshot | null>(null);
  protected readonly selectedVehicle = computed(() => this.picked() ?? this.vehicleList().at(0) ?? null);

  protected readonly matchingAlerts = computed(() => {
    const cur = this.selectedVehicle();
    const allAlerts = this.alerts.data() ?? [];
    if (!cur) return allAlerts;
    return allAlerts.filter((a) => a.plate === cur.plate);
  });

  protected readonly gauges = computed<Gauge[]>(() => {
    const c = this.selectedVehicle();
    if (!c) return [];
    const pct = (v: number, max: number) => Math.max(0, Math.min(100, (v / max) * 100));
    return [
      { icon: 'ph-gauge', title: 'Tacómetro motor', value: `${c.rpm}`, unit: 'RPM', pct: pct(c.rpm, 8000), state: 'ok' },
      { icon: 'ph-speedometer', title: 'Velocímetro', value: `${c.speedKmh}`, unit: 'km/h', pct: pct(c.speedKmh, 200), state: 'ok' },
      { icon: 'ph-thermometer', title: 'Refrigerante', value: `${c.coolantTempC}°`, unit: 'Celsius', pct: pct(c.coolantTempC, 120), state: c.coolantTempC > 100 ? 'danger' : c.coolantTempC > 95 ? 'warn' : 'ok' },
      { icon: 'ph-battery-charging', title: 'Batería 12V', value: `${c.batteryVoltageV}`, unit: 'Voltios (V)', pct: pct(c.batteryVoltageV, 15), state: c.batteryVoltageV < 12.5 ? 'warn' : 'ok' },
      { icon: 'ph-gas-pump', title: 'Combustible', value: `${c.fuelLevelPct}%`, unit: 'Capacidad', pct: c.fuelLevelPct, state: 'ok' },
      { icon: 'ph-engine', title: 'Carga motor', value: `${c.engineLoadPct}%`, unit: 'Carga calculada', pct: c.engineLoadPct, state: 'ok' },
    ];
  });

  protected selectVehicle(v: TelemetrySnapshot): void {
    this.picked.set(v);
  }

  protected simulatePulse(): void {
    const current = this.selectedVehicle();
    if (current && current.connected) {
      this.picked.set({
        ...current,
        rpm: Math.floor(2200 + Math.random() * 600),
        speedKmh: Math.floor(75 + Math.random() * 20),
        coolantTempC: Math.min(105, current.coolantTempC + Math.floor(Math.random() * 3 - 1)),
        engineLoadPct: Math.floor(50 + Math.random() * 25),
        lastPing: 'Ahora mismo',
      });
    }
  }

  protected reloadAll(): void {
    this.vehicles.reload();
    this.alerts.reload();
  }
}
