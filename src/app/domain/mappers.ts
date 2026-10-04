import {
  AppointmentDto,
  BranchDto,
  DtcAlertDto,
  Obd2DeviceDto,
  Obd2RegistrationDto,
  PersonDto,
  ProductDetailsDto,
  ProductDto,
  QuoteDto,
  TelemetrySnapshotDto,
  VehicleDto,
  VoucherDto,
  WorkOrderDto,
  WorkOrderTaskDto,
} from './backend';
import {
  Appointment,
  BillingInvoice,
  Branch,
  DtcAlert,
  OrderStatus,
  Product,
  Quote,
  Severity,
  TaskStatus,
  TaskView,
  TelemetrySnapshot,
  WorkOrder,
} from './models';

/** Resolved neighbours of a record (other services own them), all optional: the screens degrade to a dash. */
export interface Refs {
  vehicle?: VehicleDto | null;
  customer?: PersonDto | null;
  employees?: ReadonlyMap<string, PersonDto>;
  products?: ReadonlyMap<string, ProductDto>;
}

export const fullName = (p?: Pick<PersonDto, 'firstName' | 'lastName' | 'businessName'> | null): string =>
  p ? [p.firstName, p.lastName].filter(Boolean).join(' ') || (p.businessName ?? '—') : '—';

export const vehicleLabel = (v?: VehicleDto | null): string =>
  v ? [v.brand, v.model, v.year].filter(Boolean).join(' ') : '—';

const shortId = (id: string): string => id.slice(0, 8).toUpperCase();

export function toBranch(b: BranchDto): Branch {
  return { id: b.id, name: b.name, code: b.code, address: b.address, phone: b.phone, activeBays: 0 };
}

// ---------- Operations ----------

export const toOrderStatus = (s: WorkOrderDto['status']): OrderStatus => (s === 'PENDING' ? 'OPEN' : s);

export const toTaskStatus = (s: WorkOrderTaskDto['status']): TaskStatus =>
  s === 'DOING' ? 'IN_PROGRESS' : s === 'COMPLETED' ? 'DONE' : 'PENDING';

function toParts(t: WorkOrderTaskDto, refs: Refs) {
  return (t.products ?? []).map((p) => {
    const product = refs.products?.get(p.productId);
    return { sku: product?.sku ?? shortId(p.productId), name: product?.name ?? '—', qty: p.quantity, unitPrice: p.unitPrice };
  });
}

export function toWorkOrder(o: WorkOrderDto, refs: Refs): WorkOrder {
  return {
    id: o.id,
    code: o.formattedNumber ?? `OT-${o.internalNumber}`,
    plate: refs.vehicle?.plateNumber ?? '—',
    vehicle: vehicleLabel(refs.vehicle),
    customer: fullName(refs.customer),
    mileageKm: o.mileageIn ?? undefined,
    status: toOrderStatus(o.status),
    createdAt: o.createdAt,
    total: Number(o.totalAmount ?? 0),
    tasks: (o.tasks ?? []).map((t) => ({
      id: t.id,
      title: t.description,
      status: toTaskStatus(t.status),
      assignee: t.assignedMechanicId ? fullName(refs.employees?.get(t.assignedMechanicId)) : '—',
      parts: toParts(t, refs),
      completedAt: t.completedAt ?? undefined,
    })),
  };
}

/** One row of the technician's list: a task plus the order and vehicle it belongs to. */
export function toTaskView(taskId: string, order: WorkOrder): TaskView {
  const task = order.tasks.find((x) => x.id === taskId)!;
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    orderCode: order.code,
    plate: order.plate,
    vehicle: order.vehicle,
    parts: task.parts,
  };
}

// ---------- Inventory ----------

const CATEGORIES: readonly Product['category'][] = [
  'LUBRICANTES',
  'FRENOS',
  'FILTROS',
  'SENSORES',
  'SUSPENSION',
  'SISTEMA_ELECTRICO',
];

export function toProduct(p: ProductDto | ProductDetailsDto): Product {
  const category = (p.category ?? '').toUpperCase() as Product['category'];
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: CATEGORIES.includes(category) ? category : 'FILTROS',
    stock: p.currentStock ?? 0,
    minStock: p.minimumStock ?? 0,
    unitPrice: Number(p.salePrice ?? 0),
    locationRack: p.category ?? '',
    batches: ('batches' in p ? p.batches : []).map((b) => ({
      id: b.batchId,
      batchNumber: shortId(b.batchId),
      receivedAt: b.createdAt,
      qty: b.availableQuantity,
      unitCost: Number(b.acquisitionCost ?? 0),
      supplier: '—',
    })),
  };
}

// ---------- IoT ----------

const SEVERITY: Record<DtcAlertDto['severity'], Severity> = {
  LOW: 'medium',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/** DTC code letter (SAE J2012) to the system chips the UI knows. */
function systemOf(code: string): DtcAlert['system'] {
  switch (code.charAt(0).toUpperCase()) {
    case 'C':
      return 'FRENOS_ABS';
    case 'B':
    case 'U':
      return 'ELECTRICO';
    default:
      return /^P04/i.test(code) ? 'EMISIONES' : 'COMBUSTION';
  }
}

const byDate = <T extends { createdAt: string }>(a: T, b: T) => a.createdAt.localeCompare(b.createdAt);

export function toDtcAlert(
  a: DtcAlertDto,
  vehicle: VehicleDto | null | undefined,
  snapshots: readonly TelemetrySnapshotDto[],
): DtcAlert {
  const temps = [...snapshots].sort(byDate).slice(-12).map((s) => s.temperature);
  // The alert chart needs at least two points to draw a line.
  const readings = temps.length >= 2 ? temps : [temps[0] ?? 0, temps[0] ?? 0];
  return {
    id: a.id,
    code: a.dtcCode,
    system: systemOf(a.dtcCode),
    description: a.description,
    severity: SEVERITY[a.severity] ?? 'medium',
    plate: vehicle?.plateNumber ?? '—',
    vehicle: vehicleLabel(vehicle),
    raisedAt: a.createdAt,
    readings,
    suggestedAction: a.description,
  };
}

export function toTelemetrySnapshot(
  reg: Obd2RegistrationDto,
  vehicle: VehicleDto | null | undefined,
  device: Obd2DeviceDto | null | undefined,
  snapshots: readonly TelemetrySnapshotDto[],
  alerts: readonly DtcAlertDto[],
): TelemetrySnapshot {
  const last = [...snapshots].sort(byDate).at(-1);
  return {
    vehicleId: reg.vehicleId,
    plate: vehicle?.plateNumber ?? '—',
    vehicleModel: vehicleLabel(vehicle),
    driverName: '—',
    obdSerial: device?.macAddress ?? '—',
    connected: reg.status === 'ACTIVE' && !!last,
    rpm: last?.rpm ?? 0,
    speedKmh: last?.speedKmh ?? 0,
    coolantTempC: last?.temperature ?? 0,
    fuelLevelPct: last?.fuelLevelPercent ?? 0,
    // The telemetry snapshot of the backend carries no battery, engine load or oil pressure.
    batteryVoltageV: 0,
    engineLoadPct: 0,
    oilPressurePsi: 0,
    activeDtcs: alerts.map((a) => a.dtcCode),
    lastPing: last?.createdAt ?? reg.createdAt,
  };
}

// ---------- Billing ----------

const PAYMENT: Record<string, BillingInvoice['paymentMethod']> = {
  CASH: 'EFECTIVO',
  CREDIT_CARD: 'TARJETA_CREDITO',
  DEBIT_CARD: 'TARJETA_CREDITO',
  BANK_TRANSFER: 'TRANSFERENCIA_BCP',
};

export function toInvoice(v: VoucherDto): BillingInvoice {
  const total = Number(v.totalAmount ?? 0);
  const subtotal = Math.round((total / 1.18) * 100) / 100;
  return {
    id: v.id,
    number: shortId(v.id),
    type: v.type === 'INVOICE' ? 'FACTURA' : 'BOLETA',
    customerName: v.customerName,
    customerDocument: v.customerDocumentNumber,
    workOrderCode: '—',
    plate: '—',
    // The voucher resource has no issue date; the pipe renders an empty value as a dash.
    issueDate: '',
    subtotal,
    igv: Math.round((total - subtotal) * 100) / 100,
    total,
    sunatStatus: v.externalInvoiceId ? 'ACEPTADO' : 'PENDIENTE',
    paymentMethod: PAYMENT[v.payments?.[0]?.method ?? ''] ?? 'EFECTIVO',
  };
}

const QUOTE_STATUS: Record<QuoteDto['status'], Quote['status']> = {
  DRAFT: 'PENDING',
  APPROVED: 'APPROVED',
  CANCELED: 'REJECTED',
};

export function toQuote(q: QuoteDto, order?: WorkOrder): Quote {
  return {
    id: q.id,
    code: order?.code ?? shortId(q.id),
    customerName: order?.customer ?? '—',
    vehicle: order ? `${order.vehicle} (${order.plate})` : '—',
    createdAt: order?.createdAt ?? '',
    expiresAt: '',
    total: Number(q.totalAmount ?? 0),
    status: QUOTE_STATUS[q.status] ?? 'PENDING',
  };
}

// ---------- Fleet ----------

export function toAppointment(a: AppointmentDto, refs: Refs): Appointment {
  return {
    id: a.id,
    time: a.scheduledStart.slice(11, 16),
    bayNumber: '—',
    plate: refs.vehicle?.plateNumber ?? '—',
    customer: fullName(refs.customer),
    service: a.notes || vehicleLabel(refs.vehicle),
    status: a.status === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED',
  };
}
