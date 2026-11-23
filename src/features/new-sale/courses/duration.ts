import { addMonthsIso, isIsoDate } from "@/features/contracts/contractDates";

const DAY_MS = 86_400_000;

export function diffDays(start: string, end: string): number | null {
  if (!isIsoDate(start) || !isIsoDate(end)) return null;
  const from = Date.parse(`${start}T00:00:00Z`);
  const to = Date.parse(`${end}T00:00:00Z`);
  return Math.round((to - from) / DAY_MS);
}

/**
 * Whole months, rounded, when the span reaches at least one month.
 * Shorter spans stay in days. A same-day range is not a duration.
 */
export function accessLength(start: string, end: string): { unit: "month" | "day"; count: number } | null {
  const days = diffDays(start, end);
  if (days == null || days <= 0) return null;
  if (end < addMonthsIso(start, 1)) return { unit: "day", count: days };

  let months = 0;
  while (addMonthsIso(start, months + 1) <= end) months += 1;
  const anchor = addMonthsIso(start, months);
  const extra = diffDays(anchor, end) ?? 0;
  const span = diffDays(anchor, addMonthsIso(start, months + 1)) ?? 30;
  if (extra * 2 >= span) months += 1;
  return { unit: "month", count: Math.max(1, months) };
}

export function endAfterStart(start: string, end: string): boolean {
  return Boolean(start && end && isIsoDate(start) && isIsoDate(end) && end > start);
}
