import type {
  BillingType,
  SalePayment,
  SubscriptionCycle,
  UpdateSalePayment,
} from "@/services/commercialApi";

export type PaymentLinkProvider = "HOTMART" | "ASAAS";

export const PAYMENT_LINK_PROVIDER_OPTIONS = [
  { value: "HOTMART" as const, label: "Hotmart" },
  { value: "ASAAS" as const, label: "Asaas" },
];

function toDateInput(value?: string | null): string | undefined {
  return value?.slice(0, 10) || undefined;
}

export function mapSalePaymentsToUpdatePayload(
  payments: SalePayment[],
  targetPaymentId: string,
  provider: PaymentLinkProvider,
): UpdateSalePayment[] {
  return payments.map((payment) => ({
    type: payment.type,
    gateway: payment.id === targetPaymentId ? provider : payment.gateway,
    amount: Number(payment.amount),
    dueDate: toDateInput(payment.dueDate),
    paymentDate: toDateInput(payment.paymentDate),
    status: payment.status,
    ...(payment.notes ? { notes: payment.notes } : {}),
    billingType: (payment.billingType as BillingType) || "PIX",
    ...(payment.ciclo ? { ciclo: payment.ciclo as SubscriptionCycle } : {}),
    ...(payment.totalInstallments ? { totalInstallments: payment.totalInstallments } : {}),
    ...(payment.installmentNumber ? { installmentNumber: payment.installmentNumber } : {}),
  }));
}

export function getDefaultPaymentWithoutLink(payments: SalePayment[]): SalePayment | undefined {
  return payments.find((payment) => !payment.linkPagamento) ?? payments[0];
}

export function saleHasPaymentLink(sale: { payments?: SalePayment[] }): boolean {
  return sale.payments?.some((payment) => Boolean(payment.linkPagamento)) ?? false;
}
