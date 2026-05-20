import type { CreateSaleCustomer } from "@/lib/commercialApi";
import type { SalePaymentDraft } from "./types";

export const STEP_LABELS = ["Clientes", "Produto", "Pagamentos", "Resumo"];
export const MAX_INSTALLMENTS = 120;

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  ENTRY: "Entrada",
  INSTALLMENT: "Parcelamento",
  SUBSCRIPTION: "Assinatura",
  FULL_PAYMENT: "A vista",
};

export const EMPTY_CUSTOMER: CreateSaleCustomer = { name: "", document: "" };
export const EMPTY_PAYMENT: SalePaymentDraft = {
  gateway: "",
  paymentType: "",
  amount: "",
  totalInstallments: "1",
  dueDate: "",
};
