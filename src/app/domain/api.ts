import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../core/config';
import {
  Appointment,
  BillingInvoice,
  Branch,
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
 * Microservices API Clients for DriveOS Bounded Contexts
 * All communicate via API Gateway routing.
 */

/** Operations Bounded Context (Work Orders & Tasks) */
@Injectable({ providedIn: 'root' })
export class WorkOrdersApi {
  private readonly http = inject(HttpClient);

  list(status?: OrderStatus): Observable<WorkOrder[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<WorkOrder[]>(`${API_BASE}/work-orders`, { params });
  }

  getById(id: string): Observable<WorkOrder> {
    return this.http.get<WorkOrder>(`${API_BASE}/work-orders/${id}`);
  }

  changeStatus(id: string, status: OrderStatus): Observable<WorkOrder> {
    return this.http.patch<WorkOrder>(`${API_BASE}/work-orders/${id}/status`, { status });
  }

  myTasks(): Observable<TaskView[]> {
    return this.http.get<TaskView[]>(`${API_BASE}/tasks`, { params: { assignee: 'me' } });
  }

  changeTaskStatus(id: string, status: TaskStatus, idempotencyKey: string): Observable<unknown> {
    return this.http.patch(
      `${API_BASE}/tasks/${id}/status`,
      { status },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  }
}

/** Inventory Bounded Context (Auto Parts & FIFO Batches) */
@Injectable({ providedIn: 'root' })
export class InventoryApi {
  private readonly http = inject(HttpClient);

  list(): Observable<Product[]> {
    return this.http.get<Product[]>(`${API_BASE}/products`);
  }

  lowStock(): Observable<Product[]> {
    return this.http.get<Product[]>(`${API_BASE}/products/low-stock`);
  }
}

/** IoT & Telemetry Bounded Context (OBD-II, Gauges & DTC Alarms) */
@Injectable({ providedIn: 'root' })
export class TelemetryApi {
  private readonly http = inject(HttpClient);

  listVehicles(): Observable<TelemetrySnapshot[]> {
    return this.http.get<TelemetrySnapshot[]>(`${API_BASE}/iot/vehicles`);
  }

  getAlerts(): Observable<DtcAlert[]> {
    return this.http.get<DtcAlert[]>(`${API_BASE}/vehicles/dtc-alerts`);
  }

  clearDtc(alertId: string): Observable<{ success: boolean; clearedAt: string }> {
    return this.http.post<{ success: boolean; clearedAt: string }>(`${API_BASE}/iot/dtc/${alertId}/clear`, {});
  }
}

/** Backward compatibility alias */
export { TelemetryApi as AlertsApi };

/** Billing & SUNAT Bounded Context (Invoices, Quotes, Payments) */
@Injectable({ providedIn: 'root' })
export class BillingApi {
  private readonly http = inject(HttpClient);

  listInvoices(): Observable<BillingInvoice[]> {
    return this.http.get<BillingInvoice[]>(`${API_BASE}/billing/invoices`);
  }

  listQuotes(): Observable<Quote[]> {
    return this.http.get<Quote[]>(`${API_BASE}/billing/quotes`);
  }
}

/** Fleet & Maintenance Appointments Bounded Context */
@Injectable({ providedIn: 'root' })
export class AppointmentsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${API_BASE}/appointments`);
  }
}

/** Core Bounded Context (Workshop & Multi-Branch) */
@Injectable({ providedIn: 'root' })
export class CoreApi {
  private readonly http = inject(HttpClient);

  getBranches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(`${API_BASE}/core/branches`);
  }
}
