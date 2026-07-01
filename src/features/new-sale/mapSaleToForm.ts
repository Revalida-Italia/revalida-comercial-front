import type { BillingType, CreateSaleCustomer, SaleRecord, SaleStatus, SubscriptionCycle } from "@/services/commercialApi";
import { DEFAULT_SUBSCRIPTION_CYCLE } from "./constants";
import type { SaleItemDraft, SalePaymentDraft } from "./types";

export type SaleFormState = {
  customers: CreateSaleCustomer[];
  items: SaleItemDraft[];
  payments: SalePaymentDraft[];
  currency: string;
  status: SaleStatus;
  soldAt: string;
  sellerId: string;
};

function toDateInput(value?: string | null): string {
  return value?.slice(0, 10) ?? "";
}

export function mapSaleToForm(sale: SaleRecord): SaleFormState {
  return {
    customers: (sale.clients ?? []).length > 0
      ? (sale.clients ?? []).map((client) => ({
        name: client.nameCiphertext || "",
        document: client.documentCiphertext || "",
        telefone: client.telefone || "",
        email: client.email || "",
      }))
      : [{ name: "", document: "", telefone: "", email: "" }],
    items: (sale.items ?? []).length > 0
      ? (sale.items ?? []).map((item) => ({
        productId: item.productId,
        releaseDate: toDateInput(item.releaseDate),
        notes: item.notes || "",
      }))
      : [{ productId: "", releaseDate: "", notes: "" }],
    payments: (sale.payments ?? []).length > 0
      ? (sale.payments ?? []).map((payment) => ({
        gateway: payment.gateway,
        paymentType: payment.type,
        amount: String(payment.amount),
        totalInstallments: String(payment.totalInstallments ?? 1),
        dueDate: toDateInput(payment.dueDate),
        billingType: (payment.billingType as BillingType) || "",
        ciclo: (payment.ciclo as SubscriptionCycle) || DEFAULT_SUBSCRIPTION_CYCLE,
        paymentDate: toDateInput(payment.paymentDate),
        status: payment.status || "PENDING",
        notes: payment.notes || "",
      }))
      : [],
    currency: sale.currency || "BRL",
    status: (sale.status as SaleStatus) || "PENDING",
    soldAt: toDateInput(sale.soldAt),
    sellerId: sale.sellerId,
  };
}
