import { apiRequest } from "@/lib/http";
import { parseAsaasPaymentLinkResponse, type AsaasPaymentLinkResult } from "@/services/asaasPaymentLink";
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

export type CreateAssinaturaResult = AsaasPaymentLinkResult;

export async function createAssinatura(input: CreateAssinaturaInput): Promise<CreateAssinaturaResult> {
  const payload = await apiRequest<unknown>(
    CORE_API_URL,
    "/api/assinaturas",
    {
      method: "POST",
      body: input,
    },
  );

  return parseAsaasPaymentLinkResponse(payload, "Resposta da API de assinatura sem link de cobrança.");
}
