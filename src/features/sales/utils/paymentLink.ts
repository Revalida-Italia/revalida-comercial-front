import type { BillingType, SalePayment, SaleRecord, SubscriptionCycle } from "@/services/commercialApi";
import { DEFAULT_SUBSCRIPTION_CYCLE, PAYMENT_TYPE_LABELS, BILLING_TYPE_LABELS } from "@/features/new-sale/constants";
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

export type AssinaturaClientDraft = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
};

export function createEmptyAssinaturaClientDraft(): AssinaturaClientDraft {
  return {
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
  };
}

export function saleClientToDraft(sale: SaleRecord): AssinaturaClientDraft {
  const client = sale.clients?.[0];

  return {
    nome: client?.nameCiphertext?.trim() || "",
    cpf: client?.documentCiphertext?.trim() || "",
    email: client?.email?.trim() || "",
    telefone: client?.telefone?.trim() || "",
  };
}

export function isValidAssinaturaClientDraft(client: AssinaturaClientDraft): boolean {
  return Boolean(client.nome.trim() && client.cpf.trim() && client.telefone.trim());
}

export type SalePaymentLinkItem = {
  paymentId: string;
  linkPagamento: string;
  gateway: string;
  type: string;
  amount: string | number;
  billingType?: string | null;
};

export function getSalePaymentLinks(sale: SaleRecord): SalePaymentLinkItem[] {
  return (sale.payments ?? [])
    .filter((payment): payment is SalePayment & { linkPagamento: string } => Boolean(payment.linkPagamento))
    .map((payment) => ({
      paymentId: payment.id,
      linkPagamento: payment.linkPagamento!,
      gateway: payment.gateway,
      type: payment.type,
      amount: payment.amount,
      billingType: payment.billingType,
    }));
}

export function formatPaymentLinkLabel(payment: SalePaymentLinkItem): string {
  const typeLabel = PAYMENT_TYPE_LABELS[payment.type] ?? payment.type;
  const billingLabel = payment.billingType
    ? BILLING_TYPE_LABELS[payment.billingType] ?? payment.billingType
    : null;

  return [payment.gateway, typeLabel, billingLabel, `R$ ${payment.amount}`]
    .filter(Boolean)
    .join(" · ");
}
