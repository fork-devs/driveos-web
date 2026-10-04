import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
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
} from '../../domain/models';
import { API_BASE } from '../config';

/**
 * View-model level endpoints served only by mock-api.interceptor (mock mode). The real backend has
 * different paths and shapes; domain/api.ts maps those. Delete this file with the mocks.
 */
@Injectable({ providedIn: 'root' })
export class MockGateway {
  private readonly http = inject(HttpClient);

  orders = (status?: OrderStatus) =>
    this.http.get<WorkOrder[]>(`${API_BASE}/work-orders`, { params: status ? { status } : undefined });
  order = (id: string) => this.http.get<WorkOrder>(`${API_BASE}/work-orders/${id}`);
  setOrderStatus = (id: string, status: OrderStatus) =>
    this.http.patch<WorkOrder>(`${API_BASE}/work-orders/${id}/status`, { status });
  tasks = () => this.http.get<TaskView[]>(`${API_BASE}/tasks`, { params: { assignee: 'me' } });
  setTaskStatus = (id: string, status: TaskStatus, key: string) =>
    this.http.patch(`${API_BASE}/tasks/${id}/status`, { status }, { headers: { 'Idempotency-Key': key } });
  products = () => this.http.get<Product[]>(`${API_BASE}/products`);
  lowStock = () => this.http.get<Product[]>(`${API_BASE}/products/low-stock`);
  vehicles = () => this.http.get<TelemetrySnapshot[]>(`${API_BASE}/iot/vehicles`);
  alerts = () => this.http.get<DtcAlert[]>(`${API_BASE}/vehicles/dtc-alerts`);
  clearDtc = (id: string) =>
    this.http.post<{ success: boolean; clearedAt: string }>(`${API_BASE}/iot/dtc/${id}/clear`, {});
  invoices = () => this.http.get<BillingInvoice[]>(`${API_BASE}/billing/invoices`);
  quotes = () => this.http.get<Quote[]>(`${API_BASE}/billing/quotes`);
  appointments = () => this.http.get<Appointment[]>(`${API_BASE}/appointments`);
}
