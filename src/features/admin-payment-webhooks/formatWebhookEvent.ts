import { WEBHOOK_PROVIDER_LABELS, WEBHOOK_REASON_LABELS, WEBHOOK_STATUS_LABELS } from "./constants";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

export function formatWebhookReason(reason: string | null | undefined): string {
  const code = reason?.trim();
  if (!code) {
    return "—";
  }

  return WEBHOOK_REASON_LABELS[code] ?? code;
}

export function formatWebhookStatus(status: string | null | undefined): string {
  const code = status?.trim();
  if (!code) {
    return "—";
  }

  return WEBHOOK_STATUS_LABELS[code] ?? code;
}

export function formatWebhookProvider(provider: string | null | undefined): string {
  const code = provider?.trim();
  if (!code) {
    return "—";
  }

  return WEBHOOK_PROVIDER_LABELS[code] ?? code;
}

export function formatWebhookDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: SAO_PAULO_TIME_ZONE,
  }).format(date);
}

export function formatWebhookAmount(
  amountMinor: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (amountMinor == null || !Number.isFinite(amountMinor)) {
    return "—";
  }

  const code = (currency?.trim() || "brl").toUpperCase();
  const major = amountMinor / 100;

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: code,
    }).format(major);
  } catch {
    return `${major.toLocaleString("pt-BR")} ${code}`;
  }
}

export function formatWebhookAmountMismatch(event: {
  reason?: string | null;
  amount?: number | null;
  currency?: string | null;
  expectedAmount?: number | null;
  expectedCurrency?: string | null;
}): string | null {
  if (event.reason?.trim() !== "amount_mismatch") {
    return null;
  }

  if (event.expectedAmount == null || !Number.isFinite(event.expectedAmount)) {
    return null;
  }

  const expected = formatWebhookAmount(event.expectedAmount, event.expectedCurrency);
  const received = formatWebhookAmount(event.amount, event.currency);
  return `esperado ${expected} / recebido ${received}`;
}

export function webhookErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  if (error.message === "WEBHOOK_EVENT_NOT_FOUND") {
    return "Evento não encontrado.";
  }

  return error.message;
}
