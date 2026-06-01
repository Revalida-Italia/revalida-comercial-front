import type { CreateSaleCustomer } from "@/services/commercialApi";
import type { SalePaymentDraft } from "./types";

export const STEP_LABELS = ["Clientes", "Produto", "Pagamentos", "Resumo"];
export const MAX_INSTALLMENTS = 120;

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  ENTRY: "Entrada",
  INSTALLMENT: "Parcelamento",
  SUBSCRIPTION: "Assinatura",
  FULL_PAYMENT: "A vista",
};

export const BILLING_TYPE_OPTIONS = [
  { value: "PIX", label: "PIX" },
  { value: "BOLETO", label: "Boleto" },
  { value: "CREDIT_CARD", label: "Cartao de credito" },
] as const;

export const SUBSCRIPTION_CYCLE_OPTIONS = [
  { value: "WEEKLY", label: "Semanal" },
  { value: "BIWEEKLY", label: "Quinzenal" },
  { value: "MONTHLY", label: "Mensal" },
  { value: "QUARTERLY", label: "Trimestral" },
  { value: "SEMIANNUALLY", label: "Semestral" },
  { value: "YEARLY", label: "Anual" },
] as const;

export const DEFAULT_SUBSCRIPTION_CYCLE = "MONTHLY";

export const BILLING_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  BILLING_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

export const SUBSCRIPTION_CYCLE_LABELS: Record<string, string> = Object.fromEntries(
  SUBSCRIPTION_CYCLE_OPTIONS.map((option) => [option.value, option.label]),
);

export const EMPTY_CUSTOMER: CreateSaleCustomer = { name: "", document: "", telefone: "", email: "" };
export const EMPTY_PAYMENT: SalePaymentDraft = {
  gateway: "",
  paymentType: "",
  amount: "",
  totalInstallments: "1",
  dueDate: "",
  billingType: "",
  ciclo: DEFAULT_SUBSCRIPTION_CYCLE,
};
