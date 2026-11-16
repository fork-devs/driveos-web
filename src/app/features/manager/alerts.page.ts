import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, catchError, exhaustMap, timer } from 'rxjs';
import { Lookups } from '../../domain/lookups';
import { BranchContext } from '../../core/branch/branch-context.service';
import { loadable } from '../../core/api/loadable';
import { API_BASE } from '../../core/config';
import { VehicleDto } from '../../domain/backend';

type CatalogVehicle = VehicleDto & { plate?: string };

type AlertStatus = 'PENDING' | 'IN_REVIEW' | 'ATTENDED' | 'DISMISSED';

interface PreventiveAlert {
  id: string;
  vehicle_id: string;
  timestamp: string;
  code: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  status: AlertStatus;
  history: { status: AlertStatus; changed_by: string; changed_at: string; reason?: string }[];
  appointment_id?: string;
  bay_number?: number;
  technician_id?: string;
}

interface AppointmentResources {
  bays: { number: number; name: string }[];
  technicians: { id: string; specialty: string }[];
}

@Component({
  selector: 'app-alerts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  styleUrl: '../page.scss',
  styles: `
    form, .actions { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-block: 12px; }
    label { display: grid; gap: 4px; }
    input, select, button { font: inherit; padding: 6px; }
    .rows { display: grid; gap: 16px; }
    .alert { padding: 16px; }
    .alert h2 { margin: 0 0 8px; font-size: 1.1rem; }
    .notice { margin-block: 8px; }
    .pagination { display: flex; gap: 12px; align-items: center; margin-block: 16px; }
  `,
  template: `
    <div class="head"><h1>Alertas preventivas</h1></div>
    <form (submit)="applyFilters($event, vehicle.value, customer.value, state.value, severity.value, since.value, until.value)">
      <label>Vehículo
        <select #vehicle>
          <option value="">Todos</option>
          @for (item of vehicles.data(); track item.id) {
            <option [value]="item.id">{{ item.plate || item.plateNumber }} — {{ item.brand }} {{ item.model }}</option>
          }
        </select>
      </label>
      <label>Cliente
        <select #customer>
          <option value="">Todos</option>
          @for (item of customers.data(); track item.id) {
            <option [value]="item.id">{{ item.fullName }}</option>
          }
        </select>
      </label>
      <label>Estado
        <select #state>
          <option value="">Todos</option>
          @for (value of statuses; track value) { <option [value]="value">{{ labels[value] }}</option> }
        </select>
      </label>
      <label>Nivel
        <select #severity>
          <option value="">Todos</option>
          <option value="CRITICAL">Crítico</option>
          <option value="WARNING">Advertencia</option>
          <option value="INFO">Informativo</option>
        </select>
      </label>
      <label>Desde <input #since type="date"></label>
      <label>Hasta <input #until type="date"></label>
      <button type="submit" [disabled]="alerts.loading()">Filtrar</button>
    </form>
    @if (newAlert()) {
      <p class="notice" role="status">Hay una nueva alerta preventiva.
        <button type="button" [disabled]="saving() || !!scheduling()" (click)="refreshNotifiedAlert()">Actualizar</button>
      </p>
    }
    @if (customers.error()) { <p role="status">El catálogo de clientes no pudo cargarse.</p> }
    @if (vehicles.error()) { <p role="status">El catálogo de vehículos no pudo cargarse.</p> }
    @if (error()) { <p class="notice" role="alert">{{ error() }}</p> }
    @if (feedback()) { <p class="notice" role="status">{{ feedback() }}</p> }
    @if (alerts.loading()) {
      <p role="status">Cargando alertas…</p>
    } @else if (alerts.error()) {
      <p role="alert">No se pudieron cargar las alertas. <button type="button" (click)="alerts.reload()">Reintentar</button></p>
    } @else {
      <div class="rows">
        @for (alert of alerts.data(); track alert.id) {
          <article class="card alert">
            <h2>{{ alert.code }} · {{ vehicleName(alert.vehicle_id) }}</h2>
            <p>{{ alert.description }}</p>
            <p>{{ alert.timestamp | date:'medium' }} · {{ severityLabels[alert.severity] }} · {{ labels[alert.status] }}</p>
            <form (submit)="changeStatus($event, alert, nextStatus.value, reason.value)">
              <label>Nuevo estado
                <select #nextStatus>
                  @for (value of statuses; track value) {
                    <option [value]="value" [selected]="value === alert.status">{{ labels[value] }}</option>
                  }
                </select>
              </label>
              <label>Motivo de descarte <input #reason maxlength="500"></label>
              <button type="submit" [disabled]="saving()">Guardar estado</button>
            </form>
            @if (alert.appointment_id) {
              <p>Cita vinculada <strong>{{ alert.appointment_id }}</strong></p>
              @if (alert.bay_number && alert.technician_id) {
                <p>Bahía {{ alert.bay_number }} · Técnico {{ technicianName(alert.technician_id) }}</p>
              }
            } @else if (alert.status === 'PENDING' || alert.status === 'IN_REVIEW') {
              <button type="button" [disabled]="saving()" (click)="scheduling.set(alert.id)">Programar servicio</button>
              @if (scheduling() === alert.id) {
                @if (branch.selected(); as site) {
                  <p>Sede de la cita: {{ site.name }}</p>
                  @if (resourceOptions(); as options) {
                    @if (options.bays.length && options.technicians.length) {
                      <form (submit)="schedule($event, alert, site.id, start.value, duration.valueAsNumber, bay.value, technician.value)">
                        <label>Inicio <input #start type="datetime-local" required></label>
                        <label>Duración en minutos <input #duration type="number" min="15" max="480" value="60" required></label>
                        <label>Bahía
                          <select #bay required>
                            <option value="">Selecciona una bahía</option>
                            @for (item of options.bays; track item.number) {
                              <option [value]="item.number">{{ item.number }} · {{ item.name }}</option>
                            }
                          </select>
                        </label>
                        <label>Técnico
                          <select #technician required>
                            <option value="">Selecciona un técnico</option>
                            @for (item of options.technicians; track item.id) {
                              <option [value]="item.id">{{ technicianName(item.id) }} · {{ item.specialty }}</option>
                            }
                          </select>
                        </label>
                        <button type="submit" [disabled]="saving()">Confirmar cita</button>
                      </form>
                    } @else {
                      <p role="status">Para programar la cita, la sede debe tener una bahía y un técnico activo.</p>
                    }
                  } @else if (resourcesError()) {
                    <p role="alert">No se pudieron cargar los recursos de la sede.</p>
                    <button type="button" (click)="retryResources()">Reintentar</button>
                  } @else {
                    <p role="status">Cargando bahías y técnicos…</p>
                  }
                } @else {
                  <p role="status">Selecciona la sede antes de programar.</p>
                }
                <button type="button" [disabled]="saving()" (click)="scheduling.set(null)">Cancelar</button>
              }
            }
            @if (alert.history.length) {
              <details>
                <summary>Historial de estados</summary>
                <ul>
                  @for (change of alert.history; track $index) {
                    <li>{{ change.changed_at | date:'medium' }} · {{ labels[change.status] }}
                      · {{ change.changed_by }} @if (change.reason) { · {{ change.reason }} }
                    </li>
                  }
                </ul>
              </details>
            }
          </article>
        } @empty { <p>No hay alertas con los filtros seleccionados.</p> }
      </div>
      <div class="pagination">
        <button type="button" [disabled]="page() === 0" (click)="goTo(page() - 1)">Anterior</button>
        <span>Página {{ page() + 1 }}</span>
        <button type="button" [disabled]="(alerts.data()?.length ?? 0) < pageSize" (click)="goTo(page() + 1)">Siguiente</button>
      </div>
    }
  `,
})
export class AlertsPage {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lookups = inject(Lookups);
  private readonly base = API_BASE + '/iot/alerts';
  protected readonly branch = inject(BranchContext);
  protected readonly statuses: AlertStatus[] = ['PENDING', 'IN_REVIEW', 'ATTENDED', 'DISMISSED'];
  protected readonly labels = { PENDING: 'Pendiente', IN_REVIEW: 'En revisión', ATTENDED: 'Atendida', DISMISSED: 'Descartada' };
  protected readonly severityLabels = { CRITICAL: 'Crítico', WARNING: 'Advertencia', INFO: 'Informativo' };
  protected readonly page = signal(0);
  protected readonly pageSize = 20;
  protected readonly saving = signal(false);
  protected readonly scheduling = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly feedback = signal('');
  protected readonly newAlert = signal(false);
  private lastAlertId: string | null = null;
  protected readonly resourceOptions = signal<AppointmentResources | null>(null);
  protected readonly resourcesError = signal(false);
  protected readonly technicianNames = signal(new Map<string, string>());
  private readonly resourcesAttempt = signal(0);
  private filters: Record<string, string> = {};

  constructor() {
    effect((onCleanup) => {
      const site = this.branch.selected();
      const open = this.scheduling();
      this.resourcesAttempt();
      this.resourceOptions.set(null);
      this.resourcesError.set(false);
      if (!site || !open) return;
      let names: { unsubscribe(): void } | undefined;
      const request = this.http.get<AppointmentResources>(API_BASE + '/fleet/appointments/resources', {
        params: { branchId: site.id },
      }).subscribe({
        next: (options) => {
          this.resourceOptions.set(options);
          names = this.lookups.resolve(options.technicians.map(person => person.id), this.lookups.employee)
            .subscribe(people => {
              this.technicianNames.update(names => {
                const updated = new Map(names);
                for (const [id, person] of people) {
                  updated.set(id, `${person.firstName} ${person.lastName}`.trim());
                }
                return updated;
              });
            });
        },
        error: () => this.resourcesError.set(true),
      });
      onCleanup(() => {
        names?.unsubscribe();
        request.unsubscribe();
      });
    });
    timer(0, 30_000).pipe(
      exhaustMap(() => this.http.get<PreventiveAlert[]>(this.base, { params: { size: 1 } })
        .pipe(catchError(() => EMPTY))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(items => {
      const id = items[0]?.id;
      if (!id) return;
      if (this.lastAlertId && this.lastAlertId !== id) this.newAlert.set(true);
      this.lastAlertId = id;
    });
  }

  protected refreshNotifiedAlert(): void {
    this.newAlert.set(false);
    this.goTo(0);
  }

  protected technicianName(id: string): string {
    return this.technicianNames().get(id) || id.slice(0, 8);
  }

  protected retryResources(): void {
    this.resourcesAttempt.update(attempts => attempts + 1);
  }

  protected readonly customers = loadable(() =>
    this.http.get<{ id: string; fullName: string }[]>(API_BASE + '/customers'),
  );
  protected readonly vehicles = loadable(() => this.http.get<CatalogVehicle[]>(API_BASE + '/vehicles'));
  protected readonly alerts = loadable(() =>
    this.http.get<PreventiveAlert[]>(this.base, {
      params: { ...this.filters, page: this.page(), size: this.pageSize },
    }),
  );

  protected vehicleName(id: string): string {
    const vehicle = this.vehicles.data()?.find(item => item.id === id);
    return vehicle?.plate || vehicle?.plateNumber || id;
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.alerts.reload();
  }

  protected applyFilters(event: Event, vehicle: string, customer: string, status: string,
                         severity: string, since: string, until: string): void {
    event.preventDefault();
    this.error.set('');
    this.filters = Object.fromEntries(Object.entries({
      vehicle_id: vehicle, customer_id: customer, status, severity,
      since: since ? new Date(since + 'T00:00:00').toISOString() : '',
      until: until ? new Date(until + 'T23:59:59.999').toISOString() : '',
    }).filter(([, value]) => value));
    this.goTo(0);
  }

  protected changeStatus(event: Event, alert: PreventiveAlert, status: string, reason: string): void {
    event.preventDefault();
    if (status === 'DISMISSED' && !reason.trim()) {
      this.error.set('Indica un motivo para descartar la alerta.');
      return;
    }
    this.save(
      this.http.patch<PreventiveAlert>(this.base + '/' + encodeURIComponent(alert.id) + '/status', {
        status, reason: status === 'DISMISSED' ? reason.trim() : null,
      }),
      'Estado actualizado.',
    );
  }

  protected schedule(event: Event, alert: PreventiveAlert, branchId: string, start: string,
                     minutes: number, bay: string, technician: string): void {
    event.preventDefault();
    const startTime = new Date(start).getTime();
    if (!Number.isFinite(startTime) || !Number.isInteger(minutes) || minutes < 15 || minutes > 480 || !bay || !technician) {
      this.error.set('Indica una fecha y duración válidas y selecciona una bahía y un técnico.');
      return;
    }
    this.save(
      this.http.post<PreventiveAlert>(this.base + '/' + encodeURIComponent(alert.id) + '/schedule-service', {
        branch_id: branchId, scheduled_start: new Date(startTime).toISOString(),
        scheduled_end: new Date(startTime + minutes * 60_000).toISOString(),
        bay_number: Number(bay), technician_id: technician,
      }),
      'Cita vinculada a la alerta.',
    );
  }

  private save(request: Observable<PreventiveAlert>, message: string): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.feedback.set('');
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.scheduling.set(null);
        this.feedback.set(message);
        this.alerts.reload();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(typeof error.error?.detail === 'string' ? error.error.detail : 'No se pudo guardar el cambio.');
      },
    });
  }
}
