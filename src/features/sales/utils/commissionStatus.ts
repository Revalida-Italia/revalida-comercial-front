import { formatDate } from "@/shared/utils/format";

export const SALE_API_ERROR_MESSAGES: Record<string, string> = {
  PAYMENT_NOT_PAID: "O pagamento ainda não está pago.",
  COMMISSION_HOLD_PERIOD: "A comissão ainda está no período de carência.",
  COMMISSION_CANCELLED: "A comissão está cancelada.",
  SALE_ARCHIVED: "A venda está arquivada.",
  COMMISSION_ALREADY_PAID: "A comissão já está paga.",
  PAYMENT_CANCELLED: "O pagamento está cancelado.",
  COMMISSION_NOT_FOUND: "Comissão não encontrada.",
  PAYMENT_NOT_FOUND: "Pagamento não encontrado.",
  SALE_NOT_FOUND: "Venda não encontrada.",
};

export function translateSaleApiError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : "";
  if (SALE_API_ERROR_MESSAGES[message]) {
    return SALE_API_ERROR_MESSAGES[message];
  }

  if (!message || /^[A-Z0-9_]+$/.test(message)) {
    return fallback;
  }

  return message;
}

export type CommissionPayView = {
  status?: string | null;
  paidAt?: string | null;
  eligibleAt?: string | null;
  canPay?: boolean;
};

export function isCancelledStatus(status?: string | null): boolean {
  return String(status ?? "").toUpperCase() === "CANCELLED";
}

export function commissionStatusLabel(status?: string | null): string {
  const value = String(status ?? "").toUpperCase();
  if (value === "PAID") return "Paga";
  if (value === "CANCELLED") return "Cancelada";
  return "Pendente";
}

export function commissionStatusText(commission?: {
  status?: string | null;
  paidAt?: string | null;
} | null): string {
  const label = commissionStatusLabel(commission?.status);
  if (String(commission?.status ?? "").toUpperCase() === "PAID" && commission?.paidAt) {
    return `Paga em ${formatDate(commission.paidAt)}`;
  }

  return label;
}

export function commissionHoldLabel(eligibleAt?: string | null): string | null {
  if (!eligibleAt) return null;
  return `Disponível em ${formatDate(eligibleAt)}`;
}
