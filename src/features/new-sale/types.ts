import type { CreateSaleCustomer } from "@/lib/commercialApi";

export type SalePaymentDraft = {
  gateway: string;
  paymentType: string;
  amount: string;
  totalInstallments: string;
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
  feeRate: number;
};

export type FilledSaleCustomer = Required<Pick<CreateSaleCustomer, "name">> & Pick<CreateSaleCustomer, "document">;
