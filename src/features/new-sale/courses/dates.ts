import { dateOrder } from "@/i18n";
import { isIsoDate } from "@/features/contracts/contractDates";

export function formatAccessDate(iso: string): string {
  if (!isIsoDate(iso)) return "";
  const [year, month, day] = iso.split("-");
  return dateOrder() === "mdy" ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
}

/** Keeps digits and inserts slashes. The order follows the active language. */
export function maskAccessDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseAccessDate(display: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display.trim());
  if (!match) return null;
  const iso = dateOrder() === "mdy"
    ? `${match[3]}-${match[1]}-${match[2]}`
    : `${match[3]}-${match[2]}-${match[1]}`;
  return isIsoDate(iso) ? iso : null;
}

export function todayIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts;
}
