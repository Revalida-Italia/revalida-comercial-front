import { apiRequest } from "@/lib/http";
import { parseAsaasPaymentLinkResponse, type AsaasPaymentLinkResult } from "@/services/asaasPaymentLink";
import type { BillingType } from "@/services/commercialApi";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

export interface CreateCobrancaInput {
  nome: string;
  cpf: string;
  telefone: string;
  descricao: string;
  valor: number;
  valorTotal: number;
  vencimento: string;
  billingType: BillingType;
  tipo: string;
  parcelas?: number;
}

export async function createCobranca(input: CreateCobrancaInput): Promise<AsaasPaymentLinkResult> {
  const payload = await apiRequest<unknown>(
    CORE_API_URL,
    "/api/cobrancas",
    {
      method: "POST",
      body: input,
    },
  );

  return parseAsaasPaymentLinkResponse(payload, "Resposta da API de cobrança sem link de pagamento.");
}
