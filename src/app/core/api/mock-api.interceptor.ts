import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Profile, Role } from '../../domain/models';
import { API_BASE, USE_MOCKS } from '../config';
import {
  appointments,
  branches,
  dtcAlerts,
  invoices,
  products,
  quotes,
  tasksFor,
  TECHNICIAN_NAME,
  telemetryVehicles,
  workOrders,
} from './mock-data';
import { ProblemDetails } from './problem-details';

const LATENCY_MS = 50;
const ORDER_FLOW = ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'PAID'] as const;

/** Idempotency keys already applied, so a retried offline action is not applied twice. */
const applied = new Set<string>();

function problem(status: number, title: string, url: string): HttpErrorResponse {
  const body: ProblemDetails = { type: 'about:blank', title, status, instance: url };
  return new HttpErrorResponse({ status, statusText: title, url, error: body });
}

const ok = <T>(body: T, status = 200): Observable<HttpResponse<T>> =>
  of(new HttpResponse({ status, body })).pipe(delay(LATENCY_MS));

const fail = (status: number, title: string, url: string): Observable<never> =>
  throwError(() => problem(status, title, url)).pipe(delay(LATENCY_MS));

function roleOf(req: HttpRequest<unknown>): Role | null {
  const token = req.headers.get('Authorization') ?? '';
  if (token.endsWith('.technician')) return 'technician';
  if (token.endsWith('.manager') || token.endsWith('.owner')) return 'manager';
  return null;
}

function profileFor(role: Role): Profile {
  return role === 'technician'
    ? {
        id: 'u-tech-1',
        name: TECHNICIAN_NAME,
        email: 'marco.tecnico@taller.pe',
        role,
        tenantId: 'tn-001',
        workshopName: 'Taller Andino Motors',
        currentBranch: branches[0],
      }
    : {
        id: 'u-mgr-1',
        name: 'Elena Cárdenas (Jefa de Taller)',
        email: 'elena.gestor@taller.pe',
        role,
        tenantId: 'tn-001',
        workshopName: 'Taller Andino Motors',
        currentBranch: branches[0],
      };
}

/**
 * Microservices API Simulator Interceptor (API Gateway Mock).
 * Matches Bounded Context endpoints & RFC 7807 problem details.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!USE_MOCKS || !req.url.startsWith(API_BASE)) return next(req);

  const [path] = req.url.slice(API_BASE.length).split('?');
  const body = (req.body ?? {}) as Record<string, string>;
  const email = (body['email'] ?? '').toLowerCase();
  const m = req.method;

  // IAM Context: Authentication
  if (m === 'POST' && path === '/authentication/sign-in') {
    if (email.includes('bloqueado')) return fail(401, 'Invalid credentials', req.url);
    const role: Role = email.includes('tecnico') ? 'technician' : 'manager';
    return ok({ accessToken: `mock.access.${role}`, refreshToken: 'mock.refresh', expiresIn: 900 });
  }
  if (m === 'POST' && path === '/authentication/sign-up') {
    if (email.includes('existente')) return fail(409, 'Email already registered', req.url);
    return ok(null, 201);
  }
  if (m === 'POST' && path === '/authentication/password-reset/request') return ok(null, 202);

  // Authenticated endpoints
  const role = roleOf(req);
  if (!role) return fail(401, 'Unauthorized', req.url);

  // IAM / Profile
  if (m === 'GET' && path === '/profiles/me') return ok(profileFor(role));

  // Core Context: Branches
  if (m === 'GET' && path === '/core/branches') return ok(branches);

  // Operations Context: Work Orders
  if (m === 'GET' && path === '/work-orders') {
    const status = req.params.get('status');
    return ok(status ? workOrders.filter((o) => o.status === status) : workOrders);
  }

  const orderById = /^\/work-orders\/([^/]+)$/.exec(path);
  if (m === 'GET' && orderById) {
    const order = workOrders.find((o) => o.id === orderById[1]);
    return order ? ok(order) : fail(404, 'Work order not found', req.url);
  }

  const orderStatus = /^\/work-orders\/([^/]+)\/status$/.exec(path);
  if (m === 'PATCH' && orderStatus) {
    const order = workOrders.find((o) => o.id === orderStatus[1]);
    if (!order) return fail(404, 'Work order not found', req.url);
    const nextStatus = body['status'] as (typeof ORDER_FLOW)[number];
    order.status = nextStatus;
    return ok(order);
  }

  // Operations Context: Technician Tasks
  if (m === 'GET' && path === '/tasks') return ok(tasksFor(profileFor(role).name));

  const taskStatus = /^\/tasks\/([^/]+)\/status$/.exec(path);
  if (m === 'PATCH' && taskStatus) {
    const key = req.headers.get('Idempotency-Key');
    const task = workOrders.flatMap((o) => o.tasks).find((t) => t.id === taskStatus[1]);
    if (!task) return fail(404, 'Task not found', req.url);
    if (!key || !applied.has(key)) {
      task.status = body['status'] as typeof task.status;
      if (key) applied.add(key);
    }
    return ok(task);
  }

  // Inventory Context: Products & FIFO Batches
  if (m === 'GET' && path === '/products') return ok(products);
  if (m === 'GET' && path === '/products/low-stock') return ok(products.filter((p) => p.stock <= p.minStock));

  // IoT & Telemetry Context
  if (m === 'GET' && path === '/vehicles/dtc-alerts') return ok(dtcAlerts);
  if (m === 'GET' && path === '/iot/vehicles') return ok(telemetryVehicles);
  const clearDtc = /^\/iot\/dtc\/([^/]+)\/clear$/.exec(path);
  if (m === 'POST' && clearDtc) {
    const alert = dtcAlerts.find((a) => a.id === clearDtc[1]);
    if (alert) {
      const idx = dtcAlerts.indexOf(alert);
      dtcAlerts.splice(idx, 1);
    }
    return ok({ success: true, clearedAt: new Date().toISOString() });
  }

  // Billing & SUNAT Context
  if (m === 'GET' && path === '/billing/invoices') return ok(invoices);
  if (m === 'GET' && path === '/billing/quotes') return ok(quotes);

  // Fleet Context: Appointments
  if (m === 'GET' && path === '/appointments') return ok(appointments);

  return fail(404, 'Not found', req.url);
};
