import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { MockGateway } from '../core/api/mock-gateway';
import { AuthService } from '../core/auth/auth.service';
import { BranchContext } from '../core/branch/branch-context.service';
import { API_BASE, USE_MOCKS } from '../core/config';
import {
  AppointmentDto,
  DtcAlertDto,
  Obd2DeviceDto,
  Obd2RegistrationDto,
  ProductDetailsDto,
  ProductDto,
  QuoteDto,
  TelemetrySnapshotDto,
  VehicleDto,
  VoucherDto,
  WorkOrderDto,
} from './backend';
import { Lookups } from './lookups';
import {
  toAppointment,
  toDtcAlert,
  toInvoice,
  toProduct,
  toQuote,
  toTaskView,
  toTelemetrySnapshot,
} from './mappers';
import {
  Appointment,
  BillingInvoice,
  DtcAlert,
  OrderStatus,
  Product,
  Quote,
  TaskStatus,
  TaskView,
  TelemetrySnapshot,
  WorkOrder,
} from './models';

/**
 * One API client per bounded context. Each returns the view models of models.ts; against the real
 * backend they call the Spring Boot resources through the gateway and map them (mappers.ts), in mock
 * mode they delegate to MockGateway. Screens do not know which one is behind them.
 */

/** A backend capability the contract does not have yet; fails like the server would. */
const notAvailable = (what: string) =>
  throwError(() => new HttpErrorResponse({ status: 501, statusText: 'Not Implemented', error: { title: what, status: 501 } }));

/** Operations Bounded Context (Work Orders & Tasks) */
@Injectable({ providedIn: 'root' })
export class WorkOrdersApi {
  private readonly http = inject(HttpClient);
  private readonly mock = inject(MockGateway);
  private readonly branch = inject(BranchContext);
  private readonly auth = inject(AuthService);
  private readonly lookups = inject(Lookups);

  private branchOrders(): Observable<WorkOrderDto[]> {
    return defer(() =>
      this.http.get<WorkOrderDto[]>(`${API_BASE}/work-orders`, { params: { branchId: this.branch.requireId() } }),
    );
  }

  list(status?: OrderStatus): Observable<WorkOrder[]> {
    if (USE_MOCKS) return this.mock.orders(status);
    return this.branchOrders().pipe(
      switchMap((orders) => this.lookups.orderViews(orders, this.branch.requireId())),
      map((orders) => (status ? orders.filter((o) => o.status === status) : orders)),
    );
  }

  getById(id: string): Observable<WorkOrder> {
    if (USE_MOCKS) return this.mock.order(id);
    return defer(() => this.lookups.orderView(id, this.branch.requireId())).pipe(
      switchMap((o) => (o ? of(o) : notAvailable('Work order not found'))),
    );
  }

  /** The backend moves an order through its states as a side effect of its tasks; there is no endpoint to set it. */
  changeStatus(id: string, status: OrderStatus): Observable<WorkOrder> {
    if (USE_MOCKS) return this.mock.setOrderStatus(id, status);
    return notAvailable('Work order status is derived from its tasks');
  }

  /** Tasks assigned to the signed-in employee, across the work orders of their branch. */
  myTasks(): Observable<TaskView[]> {
    if (USE_MOCKS) return this.mock.tasks();
    return this.branchOrders().pipe(
      switchMap((orders) =>
        this.lookups.orderViews(orders, this.branch.requireId()).pipe(
          map((views) =>
            orders.flatMap((dto, i) =>
              dto.tasks
                .filter((t) => t.assignedMechanicId === this.auth.profile()?.employeeId)
                .map((t) => toTaskView(t.id, views[i])),
            ),
          ),
        ),
      ),
    );
  }

  changeTaskStatus(id: string, status: TaskStatus, idempotencyKey: string): Observable<unknown> {
    if (USE_MOCKS) return this.mock.setTaskStatus(id, status, idempotencyKey);
    const action = status === 'IN_PROGRESS' ? 'start' : status === 'DONE' ? 'complete' : 'reopen';
    return this.http.post(`${API_BASE}/work-order-tasks/${id}/${action}`, {});
  }
}

/** Inventory Bounded Context (Auto Parts & FIFO Batches) */
@Injectable({ providedIn: 'root' })
export class InventoryApi {
  private readonly http = inject(HttpClient);
  private readonly mock = inject(MockGateway);
  private readonly branch = inject(BranchContext);

  /** The list resource has no batches, so each product's FIFO batches are read from its detail. */
  list(): Observable<Product[]> {
    if (USE_MOCKS) return this.mock.products();
    return defer(() =>
      this.http.get<ProductDto[]>(`${API_BASE}/inventory/products`, { params: { branchId: this.branch.requireId() } }),
    ).pipe(
      switchMap((list) =>
        list.length
          ? forkJoin(
              list.map((p) =>
                this.http
                  .get<ProductDetailsDto>(`${API_BASE}/inventory/products/${p.id}`)
                  .pipe(map(toProduct)),
              ),
            )
          : of([] as Product[]),
      ),
    );
  }

  lowStock(): Observable<Product[]> {
    if (USE_MOCKS) return this.mock.lowStock();
    return this.list().pipe(map((all) => all.filter((p) => p.stock <= p.minStock)));
  }
}

interface Bundle {
  reg: Obd2RegistrationDto;
  vehicle: VehicleDto | null;
  device: Obd2DeviceDto | null;
  snapshots: TelemetrySnapshotDto[];
  alerts: DtcAlertDto[];
}

/** IoT & Telemetry Bounded Context (OBD-II, Gauges & DTC Alarms) */
@Injectable({ providedIn: 'root' })
export class TelemetryApi {
  private readonly http = inject(HttpClient);
  private readonly mock = inject(MockGateway);
  private readonly branch = inject(BranchContext);
  private readonly lookups = inject(Lookups);

  /** Active OBD-II registrations of the branch with their vehicle, device, snapshots and alerts. */
  private bundles(): Observable<Bundle[]> {
    return defer(() =>
      this.http.get<Obd2RegistrationDto[]>(`${API_BASE}/obd2-device-registrations`, {
        params: { branchId: this.branch.requireId(), status: 'ACTIVE' },
      }),
    ).pipe(
      switchMap((regs) =>
        regs.length
          ? forkJoin(
              regs.map((reg) =>
                forkJoin({
                  vehicle: this.lookups.vehicle(reg.vehicleId),
                  device: this.lookups.resolve([reg.obd2DeviceId], (id) =>
                    this.http.get<Obd2DeviceDto>(`${API_BASE}/obd2-devices/${id}`),
                  ).pipe(map((m) => m.get(reg.obd2DeviceId) ?? null)),
                  snapshots: this.http.get<TelemetrySnapshotDto[]>(
                    `${API_BASE}/obd2-device-registrations/${reg.id}/telemetry-snapshots`,
                  ),
                  alerts: this.http.get<DtcAlertDto[]>(`${API_BASE}/obd2-device-registrations/${reg.id}/dtc-alerts`),
                }).pipe(map((rest): Bundle => ({ reg, ...rest }))),
              ),
            )
          : of([] as Bundle[]),
      ),
    );
  }

  listVehicles(): Observable<TelemetrySnapshot[]> {
    if (USE_MOCKS) return this.mock.vehicles();
    return this.bundles().pipe(
      map((list) => list.map((b) => toTelemetrySnapshot(b.reg, b.vehicle, b.device, b.snapshots, b.alerts))),
    );
  }

  getAlerts(): Observable<DtcAlert[]> {
    if (USE_MOCKS) return this.mock.alerts();
    return this.bundles().pipe(
      map((list) =>
        list
          .flatMap((b) => b.alerts.map((a) => toDtcAlert(a, b.vehicle, b.snapshots)))
          .sort((a, b) => b.raisedAt.localeCompare(a.raisedAt)),
      ),
    );
  }

  clearDtc(alertId: string): Observable<{ success: boolean; clearedAt: string }> {
    if (USE_MOCKS) return this.mock.clearDtc(alertId);
    return notAvailable('Clearing a DTC alert is not exposed by the IoT service');
  }
}

/** Backward compatibility alias */
export { TelemetryApi as AlertsApi };

/** Billing & SUNAT Bounded Context (Vouchers, Quotes, Payments) */
@Injectable({ providedIn: 'root' })
export class BillingApi {
  private readonly http = inject(HttpClient);
  private readonly mock = inject(MockGateway);
  private readonly branch = inject(BranchContext);
  private readonly lookups = inject(Lookups);

  listInvoices(): Observable<BillingInvoice[]> {
    if (USE_MOCKS) return this.mock.invoices();
    return defer(() =>
      this.http.get<VoucherDto[]>(`${API_BASE}/vouchers`, { params: { branchId: this.branch.requireId() } }),
    ).pipe(map((list) => list.map(toInvoice)));
  }

  listQuotes(): Observable<Quote[]> {
    if (USE_MOCKS) return this.mock.quotes();
    return defer(() =>
      this.http.get<QuoteDto[]>(`${API_BASE}/quotes`, { params: { branchId: this.branch.requireId() } }),
    ).pipe(
      switchMap((quotes) =>
        this.lookups
          .resolve(
            quotes.map((q) => q.workOrderId),
            (id) => this.lookups.orderView(id, this.branch.requireId()),
          )
          .pipe(map((orders) => quotes.map((q) => toQuote(q, orders.get(q.workOrderId))))),
      ),
    );
  }
}

/** Fleet & Maintenance Appointments Bounded Context */
@Injectable({ providedIn: 'root' })
export class AppointmentsApi {
  private readonly http = inject(HttpClient);
  private readonly mock = inject(MockGateway);
  private readonly branch = inject(BranchContext);
  private readonly lookups = inject(Lookups);

  list(): Observable<Appointment[]> {
    if (USE_MOCKS) return this.mock.appointments();
    return defer(() =>
      this.http.get<AppointmentDto[]>(`${API_BASE}/appointments`, { params: { branchId: this.branch.requireId() } }),
    ).pipe(
      map((list) => list.filter((a) => a.status !== 'CANCELED')),
      switchMap((list) =>
        forkJoin({
          vehicles: this.lookups.resolve(list.map((a) => a.vehicleId), this.lookups.vehicle),
          customers: this.lookups.resolve(list.map((a) => a.customerId), this.lookups.customer),
        }).pipe(
          map(({ vehicles, customers }) =>
            list
              .map((a) => toAppointment(a, { vehicle: vehicles.get(a.vehicleId), customer: customers.get(a.customerId) }))
              .sort((a, b) => a.time.localeCompare(b.time)),
          ),
        ),
      ),
    );
  }
}
