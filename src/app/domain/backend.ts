/**
 * JSON shapes returned by the Spring Boot services (the *Resource records in each service's interfaces/rest).
 * They are mapped to the view models in models.ts by mappers.ts; screens never see these types.
 */

export interface AuthenticatedUserDto {
  id: string;
  email: string;
  token: string;
}

export interface UserDto {
  id: string;
  email: string;
}

/** GET /profiles/roles?userId= answers a list of these. */
export type ProfileRoleDto = 'OWNER' | 'EMPLOYEE' | 'CUSTOMER';

export interface PersonDto {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  businessName?: string;
  phone?: string;
}

export interface WorkshopDto {
  id: string;
  ownerId: string;
  businessName: string;
  brandName: string;
  taxId: string;
}

export interface BranchDto {
  id: string;
  workshopId: string;
  code: string;
  name: string;
  address: string;
  phone: string;
}

export interface EmployeeRegistrationDto {
  id: string;
  employeeId: string;
  branchId: string;
  speciality: string;
  status: string;
}

export interface VehicleDto {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  vin: string;
}

export interface WorkOrderTaskProductDto {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface WorkOrderTaskDto {
  id: string;
  serviceId: string;
  assignedMechanicId: string | null;
  status: 'PENDING' | 'DOING' | 'COMPLETED';
  description: string;
  price: number;
  startedAt: string | null;
  completedAt: string | null;
  products: WorkOrderTaskProductDto[];
  createdAt: string;
}

export interface WorkOrderDto {
  id: string;
  appointmentId: string | null;
  branchId: string;
  vehicleId: string;
  customerId: string;
  internalNumber: number;
  formattedNumber: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAID';
  diagnosticSummary: string | null;
  mileageIn: number | null;
  totalAmount: number;
  tasks: WorkOrderTaskDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductDto {
  id: string;
  branchId: string;
  category: string;
  name: string;
  sku: string;
  description: string;
  salePrice: number;
  minimumStock: number;
  currentStock: number;
}

export interface ProductBatchDto {
  batchId: string;
  initialQuantity: number;
  availableQuantity: number;
  acquisitionCost: number;
  createdAt: string;
}

export interface ProductDetailsDto extends ProductDto {
  batches: ProductBatchDto[];
}

export interface Obd2DeviceDto {
  id: string;
  branchId: string;
  macAddress: string;
  status: 'AVAILABLE' | 'LINKED' | 'NOT_AVAILABLE';
}

export interface Obd2RegistrationDto {
  id: string;
  obd2DeviceId: string;
  branchId: string;
  vehicleId: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface TelemetrySnapshotDto {
  id: string;
  obd2DeviceRegistrationId: string;
  rpm: number;
  temperature: number;
  speedKmh: number;
  odometerKm: number;
  fuelLevelPercent: number;
  createdAt: string;
}

export interface DtcAlertDto {
  id: string;
  telemetrySnapshotId: string;
  branchId: string;
  dtcCode: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
}

export interface QuoteDto {
  id: string;
  workOrderId: string;
  branchId: string;
  subtotalAmount: number;
  discountPercentage: number;
  totalAmount: number;
  status: 'DRAFT' | 'APPROVED' | 'CANCELED';
}

export interface PaymentDto {
  id: string;
  amount: number;
  method: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER';
}

export interface VoucherDto {
  id: string;
  quoteId: string;
  type: 'RECEIPT' | 'INVOICE';
  customerDocumentType: string;
  customerDocumentNumber: string;
  customerName: string;
  totalAmount: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELED';
  externalInvoiceId: string | null;
  payments: PaymentDto[];
  totalPaid: number;
}

export interface AppointmentDto {
  id: string;
  branchId: string;
  customerId: string;
  vehicleId: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELED';
  notes: string | null;
}
