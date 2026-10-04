/**
 * Domain Models representing all 7 Bounded Contexts of DriveOS Platform (Atelier):
 * - IAM Context: Authentication, roles, multi-tenant profile
 * - Core Context: Workshop, branches (sedes), staff
 * - Operations Context: Work Orders, tasks, parts allocation, photo evidence
 * - IoT & Telemetry Context: OBD-II dongles, live gauges, DTC fault codes
 * - Inventory Context: Automotive parts, FIFO batches, minimum stock alerts
 * - Billing Context: SUNAT electronic invoices (Boletas/Facturas), Quotes, Payments
 * - Fleet Context: Appointments & Workshop bays scheduling
 */

export type Role = 'manager' | 'technician' | 'owner';

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  activeBays: number;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
  workshopName: string;
  currentBranch?: Branch;
}

export type OrderStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'PAID';
export const ORDER_STATUSES: readonly OrderStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'PAID'];

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface Part {
  sku: string;
  name: string;
  qty: number;
  unitPrice?: number;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  assignee: string;
  parts: Part[];
  estimatedMinutes?: number;
  completedAt?: string;
  evidencePhoto?: string;
}

export interface WorkOrder {
  id: string;
  code: string;
  plate: string;
  vehicle: string;
  customer: string;
  customerPhone?: string;
  mileageKm?: number;
  status: OrderStatus;
  createdAt: string;
  estimatedDelivery?: string;
  subtotal?: number;
  tax?: number;
  total: number;
  tasks: Task[];
  initialChecklist?: {
    fuelLevel: string;
    scratchesNoted: boolean;
    valuableItemsRemoved: boolean;
  };
}

export interface TaskView {
  id: string;
  title: string;
  status: TaskStatus;
  orderCode: string;
  plate: string;
  vehicle: string;
  parts?: Part[];
}

export interface Batch {
  id: string;
  batchNumber: string;
  receivedAt: string;
  expiresAt?: string;
  qty: number;
  unitCost: number;
  supplier: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: 'LUBRICANTES' | 'FRENOS' | 'FILTROS' | 'SENSORES' | 'SUSPENSION' | 'SISTEMA_ELECTRICO';
  stock: number;
  minStock: number;
  unitPrice: number;
  locationRack: string;
  /** Oldest first: FIFO consumes from top of list. */
  batches: Batch[];
}

export type Severity = 'medium' | 'high' | 'critical';

export interface DtcAlert {
  id: string;
  code: string;
  system: 'INYECCION' | 'COMBUSTION' | 'EMISIONES' | 'FRENOS_ABS' | 'TRANSMISION' | 'ELECTRICO';
  description: string;
  severity: Severity;
  plate: string;
  vehicle: string;
  raisedAt: string;
  /** Engine coolant temperature readings in Celsius */
  readings: number[];
  suggestedAction: string;
}

export interface TelemetrySnapshot {
  vehicleId: string;
  plate: string;
  vehicleModel: string;
  driverName: string;
  obdSerial: string;
  connected: boolean;
  rpm: number;
  speedKmh: number;
  coolantTempC: number;
  fuelLevelPct: number;
  batteryVoltageV: number;
  engineLoadPct: number;
  oilPressurePsi: number;
  activeDtcs: string[];
  lastPing: string;
}

export interface InvoiceItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface BillingInvoice {
  id: string;
  number: string; // e.g. F001-000481 o B001-001290
  type: 'FACTURA' | 'BOLETA';
  customerName: string;
  customerDocument: string; // RUC o DNI
  workOrderCode: string;
  plate: string;
  issueDate: string;
  subtotal: number;
  igv: number;
  total: number;
  sunatStatus: 'ACEPTADO' | 'PENDIENTE' | 'OBSERVADO';
  paymentMethod: 'YAPE_PLIN' | 'TARJETA_CREDITO' | 'TRANSFERENCIA_BCP' | 'EFECTIVO';
}

export interface Quote {
  id: string;
  code: string;
  customerName: string;
  vehicle: string;
  createdAt: string;
  expiresAt: string;
  total: number;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export interface Appointment {
  id: string;
  time: string;
  bayNumber: string; // e.g. "Bahía 1 (Elevador)", "Bahía 2 (Alineación)", "Bahía 3 (Scanner)"
  plate: string;
  customer: string;
  service: string;
  technicianAssigned?: string;
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED';
}
