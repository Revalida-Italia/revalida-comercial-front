import type { CommissionPayView } from "@/features/sales/utils/commissionStatus";
import type { StripePaymentMethod } from "@/features/sales/utils/stripePaymentMethod";
import type { BillingType, CreateSaleCustomer, SubscriptionCycle } from "@/services/commercialApi";
import type { DisplayCurrency } from "@/services/exchangeRatesApi";

export type SalePaymentDraft = {
  gateway: string;
  paymentType: string;
  amount: string;
  /** Moeda em que o valor foi digitado; no envio sempre converte para BRL. */
  inputCurrency: DisplayCurrency;
  totalInstallments: string;
  dueDate: string;
  billingType: BillingType | "";
  ciclo: SubscriptionCycle;
  paymentDate: string;
  status: string;
  notes: string;
  generatePaymentLink: boolean;
  /** Reais amount stored on the sale when this draft was loaded from it. */
  storedAmountBrl?: number;
  /** Amount and currency as loaded, so an unchanged edit keeps the stored reais. */
  loadedAmount?: string;
  loadedCurrency?: DisplayCurrency;
};

export type SaleItemDraft = {
  productId: string;
  releaseDate: string;
  notes: string;
};

export type SaleSummaryItem = {
  productName: string;
  releaseDate: string;
};

export type ConfiguredSalePayment = {
  id?: string;
  status?: string;
  paymentDate?: string;
  gateway: string;
  paymentType: string;
  amount: number;
  totalInstallments?: number;
  installmentNumber?: number;
  dueDate?: string;
  feeRate: number;
  /** Absent on a saved sale: the sale response does not include it. */
  billingType?: BillingType | null;
  stripePaymentMethod?: StripePaymentMethod | null;
  /** Currency of `amount` when a line was entered in a currency other than the sale's. */
  currency?: string;
  ciclo?: SubscriptionCycle;
  linkPagamento?: string;
  commission?: CommissionPayView | null;
};

export type FilledSaleCustomer = Required<Pick<CreateSaleCustomer, "name" | "telefone">> &
  Pick<CreateSaleCustomer, "document" | "email">;
