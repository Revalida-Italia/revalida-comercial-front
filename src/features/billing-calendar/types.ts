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
  source?: "PAYMENT" | "CASH_MOVEMENT";
  cashMovementId?: string | null;
  paymentId: string | null;
  saleId: string | null;
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
  bankAccount?: { id: string; name: string; institution: string } | null;
  costCenter?: { id: string; name: string; code: string | null } | null;
  kind?: string | null;
  direction?: string | null;
  currency?: string | null;
  originalCurrency?: string | null;
  originalAmount?: number | null;
  usdRateBrl?: number | null;
  eurRateBrl?: number | null;
  exchangeRateDate?: string | null;
  exchangeRateSource?: string | null;
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
