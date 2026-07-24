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

export interface AssinaturaInstallment {
  id?: string;
  asaasPaymentId?: string;
  linkCobranca?: string;
}

export interface CreateAssinaturaResponse {
  subscriptionId?: string;
  clientId?: string;
  asaasSubscriptionId?: string;
  linkPagamento?: string;
  installments?: AssinaturaInstallment[];
}

export interface CreateAssinaturaResult {
  linkPagamento: string;
  subscriptionId?: string;
  asaasSubscriptionId?: string;
  installmentId?: string;
}

function extractAssinaturaResult(payload: unknown): CreateAssinaturaResult {
  const root = payload as CreateAssinaturaResponse & { data?: CreateAssinaturaResponse };
  const data = root.data ?? root;
  const firstInstallment = data.installments?.find((item) => item.linkCobranca?.trim());

  const linkPagamento = data.linkPagamento?.trim()
    ?? firstInstallment?.linkCobranca?.trim();

  if (!linkPagamento) {
    throw new Error("Resposta da API de assinatura sem link de cobrança.");
  }

  return {
    linkPagamento,
    subscriptionId: data.subscriptionId,
    asaasSubscriptionId: data.asaasSubscriptionId,
    installmentId: firstInstallment?.id,
  };
}

export async function createAssinatura(input: CreateAssinaturaInput): Promise<CreateAssinaturaResult> {
  const payload = await apiRequest<CreateAssinaturaResponse | { data?: CreateAssinaturaResponse }>(
    CORE_API_URL,
    "/api/assinaturas",
    {
      method: "POST",
      body: input,
    },
  );

  return extractAssinaturaResult(payload);
}
