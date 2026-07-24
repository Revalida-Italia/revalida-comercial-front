import type { BillingType, SalePayment, SaleRecord, SubscriptionCycle } from "@/services/commercialApi";
import { DEFAULT_SUBSCRIPTION_CYCLE } from "@/features/new-sale/constants";
import type { SalePaymentDraft } from "@/features/new-sale/types";

export function saleHasPaymentLink(sale: { payments?: { linkPagamento?: string | null }[] }): boolean {
  return sale.payments?.some((payment) => Boolean(payment.linkPagamento)) ?? false;
}

export function getDefaultPaymentWithoutLink(payments: SalePayment[]): SalePayment | undefined {
  return payments.find((payment) => !payment.linkPagamento) ?? payments[0];
}

export function salePaymentToDraft(payment: SalePayment): SalePaymentDraft {
  return {
    gateway: "ASAAS",
    paymentType: payment.type || "",
    amount: payment.amount ? String(payment.amount) : "",
    totalInstallments: String(payment.totalInstallments ?? "1"),
    dueDate: payment.dueDate?.slice(0, 10) ?? "",
    billingType: (payment.billingType as BillingType) || "",
    ciclo: (payment.ciclo as SubscriptionCycle) || DEFAULT_SUBSCRIPTION_CYCLE,
    paymentDate: payment.paymentDate?.slice(0, 10) ?? "",
    status: payment.status || "PENDING",
    notes: payment.notes || "",
  };
}

export function createEmptyAsaasPaymentDraft(): SalePaymentDraft {
  return {
    gateway: "ASAAS",
    paymentType: "",
    amount: "",
    totalInstallments: "1",
    dueDate: "",
    billingType: "",
    ciclo: DEFAULT_SUBSCRIPTION_CYCLE,
    paymentDate: "",
    status: "PENDING",
    notes: "",
  };
}
