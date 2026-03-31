export type UserRole = 'admin' | 'vendedor';
export type VehicleType = 'CARRO' | 'MOTO' | 'CAMINHONETE' | 'CAMINHAO';
export type TicketStatus = 'ativo' | 'finalizado';
export type CashStatus = 'aberto' | 'fechado';
export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao' | 'mensalista';
export type PrinterWidth = '80mm' | '58mm';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active?: boolean;
  phone?: string;
  jobTitle?: string;
  photoUrl?: string;
  createdAt?: string;
}

export interface PriceSetting {
  id?: string;
  vehicleType: VehicleType;
  valorHora: number;
  valorAdicional: number;
  diariaMaxima?: number;
  pernoite?: number;
  mensalista?: number;
  tolerancia: number;
  active?: boolean;
  updatedAt?: string;
}

export interface ParkingSpace {
  id: string;
  code: string;
  section?: string;
  allowedType?: VehicleType | 'TODOS';
  status: 'livre' | 'ocupada' | 'inativa';
  active?: boolean;
  notes?: string;
  updatedAt?: string;
  currentTicketId?: string | null;
  currentVehicleType?: VehicleType | null;
}

export interface ParkingTicket {
  id: string;
  shortTicket: string;
  plate: string;
  model?: string;
  phone?: string;
  vehicleType: VehicleType;
  status: TicketStatus;
  entryAt: string;
  exitAt?: string;
  durationMinutes?: number;
  amountCharged?: number;
  paymentMethod?: PaymentMethod;
  cashierId: string;
  cashierName: string;
  closedCashRegisterId?: string;
  parkingSpaceId?: string;
  parkingSpaceCode?: string;
  monthlyCustomerId?: string;
  entryOperatorId?: string;
  entryOperatorName?: string;
  exitOperatorId?: string;
  exitOperatorName?: string;
}

export interface CashWithdrawal {
  amount: number;
  reason: string;
  createdAt: string;
}

export interface CashRegister {
  id: string;
  operatorId: string;
  operatorName: string;
  openedAt: string;
  closedAt?: string;
  openingAmount: number;
  withdrawals: CashWithdrawal[];
  revenueByTickets: number;
  revenueByMonthly: number;
  status: CashStatus;
}

export interface MonthlyCustomer {
  id: string;
  name: string;
  plate: string;
  phone?: string;
  vehicleType: VehicleType;
  model?: string;
  amount: number;
  dueDay?: number;
  startDate?: string;
  endDate?: string;
  lastPaymentDate?: string;
  active: boolean;
  createdAt?: string;
}

export interface EstablishmentSettings {
  id?: string;
  name?: string;
  document?: string;
  phone?: string;
  address?: string;
  totalSpaces?: number;
  toleranceMinutes?: number;
  active?: boolean;
  ticketFooter?: string;
  printerWidth?: PrinterWidth;
}