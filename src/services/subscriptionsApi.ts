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

interface CreateAssinaturaEnvelope {
  success?: boolean;
  data?: {
    linkPagamento?: string;
  };
  linkPagamento?: string;
}

function unwrapAssinaturaLink(payload: CreateAssinaturaEnvelope | { linkPagamento?: string }): string {
  if ("data" in payload && payload.data?.linkPagamento) {
    return payload.data.linkPagamento;
  }

  if ("linkPagamento" in payload && payload.linkPagamento) {
    return payload.linkPagamento;
  }

  throw new Error("Resposta da API de assinatura sem linkPagamento.");
}

export async function createAssinatura(input: CreateAssinaturaInput): Promise<{ linkPagamento: string }> {
  const payload = await apiRequest<CreateAssinaturaEnvelope | { linkPagamento?: string }>(
    CORE_API_URL,
    "/api/assinaturas",
    {
      method: "POST",
      body: input,
    },
  );

  return { linkPagamento: unwrapAssinaturaLink(payload) };
}
