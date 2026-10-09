import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { isCancelledStatus } from "@/features/sales/utils/commissionStatus";
import type { BillingCalendarEvent, BillingDailyTotal, BillingEventStatus, BillingMonthTotals } from "./types";

export function formatMonthLabel(date: Date): string {
  const raw = format(date, "MMMM yyyy", { locale: ptBR });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function toDateKeyFromIso(iso: string): string {
  const dateMatch = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateMatch?.[1]) {
    return dateMatch[1];
  }

  return iso.slice(0, 10);
}

export function buildMonthGrid(referenceDate: Date): Date[] {
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let cursor = gridStart;

  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function isOutsideCurrentMonth(day: Date, currentMonth: Date): boolean {
  return !isSameMonth(day, currentMonth);
}

export function groupEventsByDate(events: BillingCalendarEvent[]): Record<string, BillingCalendarEvent[]> {
  return events.reduce<Record<string, BillingCalendarEvent[]>>((acc, event) => {
    const key = toDateKeyFromIso(event.scheduledDate);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {});
}

export function mapDailyTotals(dailyTotals: BillingDailyTotal[]): Record<string, BillingDailyTotal> {
  return dailyTotals.reduce<Record<string, BillingDailyTotal>>((acc, item) => {
    acc[item.date] = item;
    return acc;
  }, {});
}

export const BILLING_STATUS_LABELS: Record<BillingEventStatus, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  OVERDUE: "Em atraso",
  CANCELLED: "Cancelada",
};

export const BILLING_STATUS_COLORS: Record<BillingEventStatus, string> = {
  PAID: "#16a34a",
  PENDING: "#64748b",
  OVERDUE: "#dc2626",
  CANCELLED: "hsl(var(--muted-foreground))",
};

export function normalizeBillingStatus(status?: string | null): BillingEventStatus {
  const value = String(status ?? "").toUpperCase();
  if (value === "PAID" || value === "PENDING" || value === "OVERDUE" || value === "CANCELLED") {
    return value;
  }
  return "PENDING";
}

export function billingStatusColor(status?: string | null): string {
  return BILLING_STATUS_COLORS[normalizeBillingStatus(status)];
}

export function billingStatusLabel(status?: string | null): string {
  return BILLING_STATUS_LABELS[normalizeBillingStatus(status)];
}

export function resolveBillingEventStatus(event: {
  status?: string | null;
  paymentStatus?: string | null;
}): BillingEventStatus {
  if (isCancelledStatus(event.status) || isCancelledStatus(event.paymentStatus)) {
    return "CANCELLED";
  }

  return normalizeBillingStatus(event.status);
}

export function summarizeBillingEvents(events: BillingCalendarEvent[]): BillingMonthTotals & {
  cancelledCount: number;
  cancelledAmount: number;
} {
  const summary = {
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    cancelledCount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    cancelledAmount: 0,
  };

  events.forEach((event) => {
    const status = resolveBillingEventStatus(event);
    const amount = Number(event.amount) || 0;
    if (status === "PAID") {
      summary.paidCount += 1;
      summary.paidAmount += amount;
      return;
    }
    if (status === "OVERDUE") {
      summary.overdueCount += 1;
      summary.overdueAmount += amount;
      return;
    }
    if (status === "CANCELLED") {
      summary.cancelledCount += 1;
      summary.cancelledAmount += amount;
      return;
    }
    summary.pendingCount += 1;
    summary.pendingAmount += amount;
  });

  return summary;
}
