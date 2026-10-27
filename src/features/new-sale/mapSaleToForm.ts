import type { BillingType, SaleClient, SalePayment, SaleRecord, SaleStatus, SubscriptionCycle } from "@/services/commercialApi";
import type { DisplayCurrency, ExchangeRates } from "@/services/exchangeRatesApi";
import { convertToBrl, isDisplayCurrency } from "@/shared/utils/exchange";
import { toNumberOrZero } from "@/shared/utils/number";
import { DEFAULT_SUBSCRIPTION_CYCLE } from "./constants";
import type { SaleItemDraft, SalePaymentDraft } from "./types";

export type SaleFormState = {
  customers: Array<{ name: string; document?: string; telefone: string; email?: string }>;
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

export function clientPhone(client: Pick<SaleClient, "telefone" | "phone">): string {
  return (client.telefone || client.phone || "").trim();
}

/**
 * Value shown in the payment field, in the currency the seller typed.
 * A sale is stored in reais (`amount`). The typed EUR/USD value comes back as `originalAmount`
 * on each payment that used the sale's `originalCurrency` — including the down payment.
 * Payments without that value stay in the sale currency (reais, unless the sale itself is not).
 */
export function paymentEntry(sale: SaleRecord, payment: SalePayment): {
  amount: string;
  inputCurrency: DisplayCurrency;
  storedAmountBrl: number;
} {
  const storedAmountBrl = toNumberOrZero(payment.amount);
  const originalCurrency = typeof sale.originalCurrency === "string" && isDisplayCurrency(sale.originalCurrency)
    ? sale.originalCurrency
    : null;
  const original = payment.originalAmount;
  const hasOriginal = Boolean(
    originalCurrency
    && originalCurrency !== "BRL"
    && original != null
    && original !== ""
    && Number(original) > 0,
  );

  if (hasOriginal && originalCurrency) {
    return {
      amount: String(original),
      inputCurrency: originalCurrency,
      storedAmountBrl,
    };
  }

  const saleCurrency = isDisplayCurrency(sale.currency) ? sale.currency : "BRL";
  return {
    amount: String(payment.amount ?? ""),
    inputCurrency: saleCurrency,
    storedAmountBrl,
  };
}

/** Reais to persist. An unchanged loaded payment keeps the stored snapshot instead of today's rate. */
export function brlAmountForSave(payment: SalePaymentDraft, rates?: ExchangeRates | null): number {
  const inputCurrency = payment.inputCurrency || "BRL";
  const unchanged = payment.storedAmountBrl != null
    && payment.loadedAmount != null
    && payment.loadedCurrency != null
    && payment.amount === payment.loadedAmount
    && inputCurrency === payment.loadedCurrency;

  if (unchanged) return payment.storedAmountBrl;
  return convertToBrl(Number(payment.amount), inputCurrency, rates);
}

export function mapSaleToForm(sale: SaleRecord): SaleFormState {
  return {
    customers: (sale.clients ?? []).length > 0
      ? (sale.clients ?? []).map((client) => ({
        name: client.nameCiphertext || "",
        document: client.documentCiphertext || "",
        telefone: clientPhone(client),
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
      ? (sale.payments ?? []).map((payment) => {
        const entry = paymentEntry(sale, payment);
        return {
          gateway: payment.gateway,
          paymentType: payment.type,
          amount: entry.amount,
          inputCurrency: entry.inputCurrency,
          storedAmountBrl: entry.storedAmountBrl,
          loadedAmount: entry.amount,
          loadedCurrency: entry.inputCurrency,
          totalInstallments: String(payment.totalInstallments ?? 1),
          dueDate: toDateInput(payment.dueDate),
          billingType: (payment.billingType as BillingType) || "",
          ciclo: (payment.ciclo as SubscriptionCycle) || DEFAULT_SUBSCRIPTION_CYCLE,
          paymentDate: toDateInput(payment.paymentDate),
          status: payment.status || "PENDING",
          notes: payment.notes || "",
          generatePaymentLink: false,
        };
      })
      : [],
    currency: sale.currency || "BRL",
    status: (sale.status as SaleStatus) || "PENDING",
    soldAt: toDateInput(sale.soldAt),
    sellerId: sale.sellerId?.trim() || "",
  };
}
