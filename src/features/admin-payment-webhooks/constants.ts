export const PAYMENT_WEBHOOK_EVENTS_PATH = "/admin/eventos-pagamento";

export const PAYMENT_WEBHOOK_PAGE_SIZE = 20;

export const WEBHOOK_REASON_LABELS: Record<string, string> = {
  duplicate_charge: "Cobrança duplicada",
  amount_mismatch: "Valor divergente",
  second_settled_charge: "Segunda cobrança real no mesmo pagamento",
  untracked_session: "Sessão não rastreada",
  payment_not_found: "Pagamento não encontrado",
  installment_not_found: "Parcela não encontrada",
  payment_gateway_not_stripe: "Gateway do pagamento não é Stripe",
  sale_not_found: "Venda não encontrada",
};

export const WEBHOOK_STATUS_LABELS: Record<string, string> = {
  PROCESSED: "Processado",
  UNMATCHED: "Não conciliado",
  IGNORED: "Ignorado",
  ERROR: "Erro",
};

export const WEBHOOK_PROVIDER_LABELS: Record<string, string> = {
  STRIPE: "Stripe",
  HOTMART: "Hotmart",
};
