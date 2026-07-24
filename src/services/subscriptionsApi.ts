import { apiRequest } from "@/lib/http";
import type { BillingType, SubscriptionCycle } from "@/services/commercialApi";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

export interface CreateAssinaturaInput {
  nome: string;
  cpf: string;
  telefone: string;
  descricao: string;
  valor: number;
  ciclo: SubscriptionCycle;
  primeiraCobranca: string;
  billingType: BillingType;
  maxPagamentos: number;
}

export interface CreateAssinaturaResult {
  linkPagamento: string;
  subscriptionId?: string;
  asaasSubscriptionId?: string;
  installmentId?: string;
  asaasPaymentId?: string;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function findLinkInPayload(payload: unknown): string | null {
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
      const installmentLink = findLinkInPayload(installment);
      if (installmentLink) {
        return installmentLink;
      }
    }
  }

  if ("data" in record) {
    return findLinkInPayload(record.data);
  }

  return null;
}

function extractAssinaturaResult(payload: unknown): CreateAssinaturaResult {
  const linkPagamento = findLinkInPayload(payload);

  if (!linkPagamento) {
    throw new Error("Resposta da API de assinatura sem link de cobrança.");
  }

  const root = (payload as { data?: Record<string, unknown> }).data ?? payload;
  const data = (root as { data?: Record<string, unknown> }).data ?? root;
  const record = data as Record<string, unknown>;
  const firstInstallment = Array.isArray(record.installments)
    ? record.installments[0] as Record<string, unknown> | undefined
    : undefined;

  return {
    linkPagamento,
    subscriptionId: readString(record.subscriptionId) ?? undefined,
    asaasSubscriptionId: readString(record.asaasSubscriptionId) ?? undefined,
    installmentId: readString(firstInstallment?.id) ?? undefined,
    asaasPaymentId: readString(firstInstallment?.asaasPaymentId) ?? undefined,
  };
}

export async function createAssinatura(input: CreateAssinaturaInput): Promise<CreateAssinaturaResult> {
  const payload = await apiRequest<unknown>(
    CORE_API_URL,
    "/api/assinaturas",
    {
      method: "POST",
      body: input,
    },
  );

  return extractAssinaturaResult(payload);
}
