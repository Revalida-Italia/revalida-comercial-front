import type { BillingType, CreateSaleCustomer, SubscriptionCycle } from "@/services/commercialApi";

export type SalePaymentDraft = {
  gateway: string;
  paymentType: string;
  amount: string;
  totalInstallments: string;
  dueDate: string;
  billingType: BillingType | "";
  ciclo: SubscriptionCycle;
  paymentDate: string;
  status: string;
  notes: string;
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
  gateway: string;
  paymentType: string;
  amount: number;
  totalInstallments?: number;
  dueDate?: string;
  feeRate: number;
  billingType: BillingType;
  ciclo?: SubscriptionCycle;
  linkPagamento?: string;
};

export type FilledSaleCustomer = Required<Pick<CreateSaleCustomer, "name" | "telefone">> &
  Pick<CreateSaleCustomer, "document" | "email">;
