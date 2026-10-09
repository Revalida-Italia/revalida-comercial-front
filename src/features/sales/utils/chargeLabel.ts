import { isCancelledStatus } from "@/features/sales/utils/commissionStatus";
import {
  formatStripeChargeLabel,
  type StripePaymentMethod,
} from "@/features/sales/utils/stripePaymentMethod";

const CHARGE_BILLING_LABELS: Record<string, string> = {
  CREDIT_CARD: "Cartão",
  PIX: "PIX",
  BOLETO: "Boleto",
};

export function formatPaymentChargeLabel(payment: {
  gateway?: string | null;
  billingType?: string | null;
  stripePaymentMethod?: StripePaymentMethod | null;
  status?: string | null;
  paymentType?: string | null;
}): string | null {
  if (isCancelledStatus(payment.status)) {
    return null;
  }

  const type = String(payment.paymentType ?? "").toUpperCase();
  const status = String(payment.status ?? "").toUpperCase();
  const isInstallment = type === "SUBSCRIPTION" || type === "INSTALLMENT";
  const wasCharged = status === "PAID" || status === "OVERDUE";
  if (isInstallment && status && !wasCharged) {
    return null;
  }

  if (
    String(payment.gateway ?? "").toUpperCase() === "STRIPE"
    && payment.stripePaymentMethod !== undefined
  ) {
    return formatStripeChargeLabel(payment.stripePaymentMethod);
  }

  const billing = String(payment.billingType ?? "").trim().toUpperCase();
  const label = CHARGE_BILLING_LABELS[billing];
  if (!label) {
    return null;
  }

  return `Cobrança: ${label}`;
}
