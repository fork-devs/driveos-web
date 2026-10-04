import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import { API_BASE } from '../core/config';
import { EmployeeRegistrationDto, PersonDto, ProductDto, VehicleDto, WorkOrderDto } from './backend';
import { toWorkOrder } from './mappers';
import { WorkOrder } from './models';

/**
 * Cached by-id reads of records that belong to other services (vehicle, customer, employee, product).
 * A failed lookup resolves to null so one missing neighbour never blanks a whole screen.
 */
@Injectable({ providedIn: 'root' })
export class Lookups {
  private readonly http = inject(HttpClient);
  private cache = new Map<string, Observable<unknown>>();

  private get<T>(path: string, params?: Record<string, string>): Observable<T | null> {
    const key = path + JSON.stringify(params ?? {});
    let hit = this.cache.get(key) as Observable<T | null> | undefined;
    if (!hit) {
      hit = this.http.get<T>(`${API_BASE}${path}`, { params }).pipe(
        catchError(() => of(null)),
        shareReplay(1),
      );
      this.cache.set(key, hit);
    }
    return hit;
  }

  clear(): void {
    this.cache = new Map();
  }

  vehicle = (id: string) => this.get<VehicleDto>(`/vehicles/${id}`);
  customer = (id: string) => this.get<PersonDto>(`/customers/${id}`);
  employee = (id: string) => this.get<PersonDto>(`/employees/${id}`);

  /** A task's assignedMechanicId is an employee registration; resolve it to the employee's person record. */
  mechanic = (registrationId: string): Observable<PersonDto | null> =>
    this.get<EmployeeRegistrationDto>(`/employee-registrations/${registrationId}`).pipe(
      switchMap((reg) => (reg ? this.employee(reg.employeeId) : of(null))),
    );

  /** Products of a branch by id, for naming the parts used in a task. */
  products(branchId: string): Observable<Map<string, ProductDto>> {
    return this.get<ProductDto[]>('/inventory/products', { branchId }).pipe(
      map((list) => new Map((list ?? []).map((p) => [p.id, p]))),
    );
  }

  /** Resolves each distinct id once and returns them as a map. */
  resolve<T>(ids: Iterable<string | null | undefined>, one: (id: string) => Observable<T | null>): Observable<Map<string, T>> {
    const unique = [...new Set([...ids].filter((id): id is string => !!id))];
    if (!unique.length) return of(new Map());
    return forkJoin(unique.map((id) => one(id).pipe(map((v) => [id, v] as const)))).pipe(
      map((pairs) => new Map(pairs.filter((p): p is readonly [string, T] => p[1] !== null))),
    );
  }

  /** Work orders with vehicle, customer, mechanic and part names filled in. */
  orderViews(orders: readonly WorkOrderDto[], branchId: string): Observable<WorkOrder[]> {
    return forkJoin({
      vehicles: this.resolve(orders.map((o) => o.vehicleId), this.vehicle),
      customers: this.resolve(orders.map((o) => o.customerId), this.customer),
      employees: this.resolve(
        orders.flatMap((o) => o.tasks.map((t) => t.assignedMechanicId)),
        this.mechanic,
      ),
      products: orders.some((o) => o.tasks.some((t) => t.products?.length)) ? this.products(branchId) : of(new Map<string, ProductDto>()),
    }).pipe(
      map(({ vehicles, customers, employees, products }) =>
        orders.map((o) =>
          toWorkOrder(o, { vehicle: vehicles.get(o.vehicleId), customer: customers.get(o.customerId), employees, products }),
        ),
      ),
    );
  }

  orderView(id: string, branchId: string): Observable<WorkOrder | null> {
    return this.get<WorkOrderDto>(`/work-orders/${id}`).pipe(
      switchMap((o) => (o ? this.orderViews([o], branchId).pipe(map((l) => l[0] ?? null)) : of(null))),
    );
  }
}
