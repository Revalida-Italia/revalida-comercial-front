import { apiRequest } from "@/lib/http";
import type { SalePayment } from "@/services/commercialApi";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

type PayCommissionResponse =
  | { success?: boolean; data?: { payment?: SalePayment } }
  | { payment?: SalePayment }
  | SalePayment;

function unwrapPayment(payload: PayCommissionResponse): SalePayment {
  if (payload && typeof payload === "object") {
    if ("data" in payload && payload.data?.payment?.id) {
      return payload.data.payment;
    }

    if ("payment" in payload && payload.payment?.id) {
      return payload.payment;
    }

    if ("id" in payload && typeof payload.id === "string") {
      return payload;
    }
  }

  throw new Error("Resposta de pagamento da comissão fora do contrato esperado.");
}

export async function paySalePaymentCommission(saleId: string, paymentId: string): Promise<SalePayment> {
  const payload = await apiRequest<PayCommissionResponse>(
    CORE_API_URL,
    `/sales/${encodeURIComponent(saleId)}/payments/${encodeURIComponent(paymentId)}/commission`,
    {
      method: "PATCH",
      body: {},
    },
  );

  return unwrapPayment(payload);
}
