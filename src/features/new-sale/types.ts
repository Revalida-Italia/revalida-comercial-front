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
  billingType: BillingType;
  ciclo?: SubscriptionCycle;
  linkPagamento?: string;
};

export type FilledSaleCustomer = Required<Pick<CreateSaleCustomer, "name" | "telefone">> &
  Pick<CreateSaleCustomer, "document" | "email">;
