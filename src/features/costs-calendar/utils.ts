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
import type { CostsCalendarEvent, DailyTotal, RecurrenceType } from "./types";

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

export function groupEventsByDate(events: CostsCalendarEvent[]): Record<string, CostsCalendarEvent[]> {
  return events.reduce<Record<string, CostsCalendarEvent[]>>((acc, event) => {
    const key = toDateKeyFromIso(event.scheduledDate);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {});
}

export function mapDailyTotals(dailyTotals: DailyTotal[]): Record<string, DailyTotal> {
  return dailyTotals.reduce<Record<string, DailyTotal>>((acc, item) => {
    acc[item.date] = item;
    return acc;
  }, {});
}

export const RECURRENCE_TYPE_LABELS: Record<RecurrenceType, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  BI_MONTHLY: "Bimestral",
  TRI_MONTHLY: "Trimestral",
  QUARTERLY: "Quadrimestral",
  SEMIANNUALLY: "Semestral",
  YEARLY: "Anual",
};
