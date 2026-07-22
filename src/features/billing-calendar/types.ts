export type BillingEventStatus = "PAID" | "PENDING" | "OVERDUE";

export type BillingSeller = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export type BillingSaleRef = {
  id: string;
  status?: string | null;
};

export type BillingClientRef = {
  id: string;
  nameCiphertext?: string | null;
};

export type BillingProductRef = {
  id: string;
  name?: string | null;
};

export type BillingCommissionRef = {
  id: string;
  amount?: number | string | null;
  status?: string | null;
};

export type BillingCalendarEvent = {
  instanceId: string;
  paymentId: string;
  saleId: string;
  title: string;
  description?: string | null;
  amount: number;
  scheduledDate: string;
  status: BillingEventStatus | string;
  paymentStatus?: string | null;
  paymentDate?: string | null;
  type?: string | null;
  gateway?: string | null;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  linkPagamento?: string | null;
  seller?: BillingSeller | null;
  sale?: BillingSaleRef | null;
  clients?: BillingClientRef[];
  product?: BillingProductRef | null;
  commission?: BillingCommissionRef | null;
};

export type BillingDailyTotal = {
  date: string;
  totalAmount: number;
  count: number;
  paidCount?: number;
  pendingCount?: number;
  overdueCount?: number;
};

export type BillingMonthTotals = {
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
};

export type MonthlyBillingResponse = {
  month: number;
  year: number;
  paymentTypes: string[];
  totalAmount: number;
  totals: BillingMonthTotals;
  events: BillingCalendarEvent[];
  dailyTotals: BillingDailyTotal[];
};

export type GetMonthlyBillingInput = {
  month: number;
  year: number;
  sellerId?: string;
  status?: BillingEventStatus;
  paymentTypes?: string;
};
