export type RecurrenceType =
  | "WEEKLY"
  | "MONTHLY"
  | "BI_MONTHLY"
  | "TRI_MONTHLY"
  | "QUARTERLY"
  | "SEMIANNUALLY"
  | "YEARLY";

export interface CostCategory {
  id: string;
  name: string;
  color: string;
}

export interface CostsCalendarEvent {
  instanceId: string;
  costId: string;
  source?: "FIXED_COST" | "CASH_MOVEMENT";
  cashMovementId?: string | null;
  kind?: string | null;
  direction?: string | null;
  title: string;
  description?: string | null;
  amount: number;
  scheduledDate: string;
  isRecurring: boolean;
  recurrenceType?: RecurrenceType | null;
  category: CostCategory;
  bankAccount?: { id: string; name: string; institution: string } | null;
  costCenter?: { id: string; name: string; code: string | null } | null;
  currency?: string | null;
  originalCurrency?: string | null;
  originalAmount?: number | null;
  usdRateBrl?: number | null;
  eurRateBrl?: number | null;
  exchangeRateDate?: string | null;
  exchangeRateSource?: string | null;
}

export interface DailyTotal {
  date: string;
  totalAmount: number;
  count: number;
}

export interface MonthlyCostsResponse {
  month: number;
  year: number;
  totalAmount: number;
  fixedCostTotal?: number;
  events: CostsCalendarEvent[];
  dailyTotals: DailyTotal[];
}

export interface CreateCostCategoryInput {
  name: string;
  color: string;
}

export interface UpdateCostCategoryInput {
  name?: string;
  color?: string;
}

export interface CreateCostEventInput {
  categoryId: string;
  bankAccountId?: string | null;
  costCenterId?: string | null;
  title: string;
  amount: number;
  startDate: string;
  description?: string;
  endDate?: string;
  isRecurring?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number;
}

export interface UpdateCostEventInput {
  categoryId?: string;
  bankAccountId?: string | null;
  costCenterId?: string | null;
  title?: string;
  amount?: number;
  startDate?: string;
  description?: string;
  endDate?: string;
  isRecurring?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number;
}
