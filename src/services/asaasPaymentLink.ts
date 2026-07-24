export interface AsaasPaymentLinkResult {
  linkPagamento: string;
  paymentId?: string;
  asaasPaymentId?: string;
  subscriptionId?: string;
  asaasSubscriptionId?: string;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function extractLinkFromAsaasPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const directLink = readString(record.linkPagamento) ?? readString(record.linkCobranca);

  if (directLink) {
    return directLink;
  }

  if (Array.isArray(record.installments)) {
    for (const installment of record.installments) {
      const installmentLink = extractLinkFromAsaasPayload(installment);
      if (installmentLink) {
        return installmentLink;
      }
    }
  }

  if ("data" in record) {
    return extractLinkFromAsaasPayload(record.data);
  }

  return null;
}

export function parseAsaasPaymentLinkResponse(
  payload: unknown,
  errorMessage: string,
): AsaasPaymentLinkResult {
  const linkPagamento = extractLinkFromAsaasPayload(payload);

  if (!linkPagamento) {
    throw new Error(errorMessage);
  }

  const root = (payload as { data?: Record<string, unknown> }).data ?? payload;
  const data = (root as { data?: Record<string, unknown> }).data ?? root;
  const record = data as Record<string, unknown>;
  const firstInstallment = Array.isArray(record.installments)
    ? record.installments[0] as Record<string, unknown> | undefined
    : undefined;

  return {
    linkPagamento,
    paymentId: readString(record.paymentId) ?? readString(record.id) ?? undefined,
    asaasPaymentId: readString(record.asaasPaymentId) ?? readString(firstInstallment?.asaasPaymentId) ?? undefined,
    subscriptionId: readString(record.subscriptionId) ?? undefined,
    asaasSubscriptionId: readString(record.asaasSubscriptionId) ?? undefined,
  };
}
