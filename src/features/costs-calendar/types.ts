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
  title: string;
  description?: string | null;
  amount: number;
  scheduledDate: string;
  isRecurring: boolean;
  recurrenceType?: RecurrenceType | null;
  category: CostCategory;
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
  title?: string;
  amount?: number;
  startDate?: string;
  description?: string;
  endDate?: string;
  isRecurring?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number;
}
