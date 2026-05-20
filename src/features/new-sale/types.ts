import type { CreateSaleCustomer } from "@/lib/commercialApi";

export type SalePaymentDraft = {
  gateway: string;
  paymentType: string;
  amount: string;
  totalInstallments: string;
  dueDate: string;
};

export type SaleItemDraft = {
  productId: string;
  releaseDate: string;
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
};

export type FilledSaleCustomer = Required<Pick<CreateSaleCustomer, "name">> & Pick<CreateSaleCustomer, "document">;
