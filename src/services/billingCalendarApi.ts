import { apiRequest } from "@/lib/http";
import type {
  GetMonthlyBillingInput,
  MonthlyBillingResponse,
} from "@/features/billing-calendar/types";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;
const BILLING_CALENDAR_BASE_PATH = "/api/billing-calendar";

export type SalePaymentStatusUpdate = "PAID" | "PENDING";

export type UpdateSalePaymentStatusInput = {
  saleId: string;
  paymentId: string;
  status: SalePaymentStatusUpdate;
  paymentDate?: string;
};

export type UpdatedSalePayment = {
  id: string;
  saleId: string;
  status: string;
  paymentDate?: string | null;
  amount?: number | string;
  type?: string | null;
  dueDate?: string | null;
  commission?: {
    id: string;
    status?: string | null;
    paidAt?: string | null;
  } | null;
};

interface PaymentStatusResponseWrapper {
  success?: boolean;
  data?: {
    payment?: UpdatedSalePayment;
  };
}

interface MonthlyResponseWrapper {
  data?: Partial<MonthlyBillingResponse>;
  success?: boolean;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMonthlyBillingResponse(
  payload: MonthlyBillingResponse | MonthlyResponseWrapper | Partial<MonthlyBillingResponse>,
  input: GetMonthlyBillingInput,
): MonthlyBillingResponse {
  const base = "data" in (payload as MonthlyResponseWrapper)
    ? ((payload as MonthlyResponseWrapper).data ?? {})
    : (payload as Partial<MonthlyBillingResponse>);

  const totals = base.totals ?? {
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
  };

  return {
    month: typeof base.month === "number" ? base.month : input.month,
    year: typeof base.year === "number" ? base.year : input.year,
    paymentTypes: Array.isArray(base.paymentTypes) ? base.paymentTypes : ["SUBSCRIPTION"],
    totalAmount: toNumber(base.totalAmount),
    totals: {
      paidCount: toNumber(totals.paidCount),
      pendingCount: toNumber(totals.pendingCount),
      overdueCount: toNumber(totals.overdueCount),
      paidAmount: toNumber(totals.paidAmount),
      pendingAmount: toNumber(totals.pendingAmount),
      overdueAmount: toNumber(totals.overdueAmount),
    },
    events: Array.isArray(base.events)
      ? base.events.map((event) => ({
        ...event,
        amount: toNumber(event.amount),
        instanceId: event.instanceId || event.paymentId,
        saleId: event.saleId || event.sale?.id || "",
        paymentId: event.paymentId || event.instanceId,
      }))
      : [],
    dailyTotals: Array.isArray(base.dailyTotals)
      ? base.dailyTotals.map((item) => ({
        ...item,
        totalAmount: toNumber(item.totalAmount),
        count: toNumber(item.count),
        paidCount: toNumber(item.paidCount),
        pendingCount: toNumber(item.pendingCount),
        overdueCount: toNumber(item.overdueCount),
      }))
      : [],
  };
}

export async function getMonthlyBilling(input: GetMonthlyBillingInput): Promise<MonthlyBillingResponse> {
  const params = new URLSearchParams({
    month: String(input.month),
    year: String(input.year),
  });

  if (input.sellerId) {
    params.set("sellerId", input.sellerId);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  if (input.paymentTypes) {
    params.set("paymentTypes", input.paymentTypes);
  }

  const payload = await apiRequest<
    MonthlyBillingResponse | MonthlyResponseWrapper | Partial<MonthlyBillingResponse>
  >(
    CORE_API_URL,
    `${BILLING_CALENDAR_BASE_PATH}/monthly?${params.toString()}`,
  );

  return normalizeMonthlyBillingResponse(payload, input);
}

export async function updateSalePaymentStatus(
  input: UpdateSalePaymentStatusInput,
): Promise<UpdatedSalePayment> {
  const body: { status: SalePaymentStatusUpdate; paymentDate?: string } = {
    status: input.status,
  };

  if (input.status === "PAID" && input.paymentDate) {
    body.paymentDate = input.paymentDate;
  }

  const payload = await apiRequest<PaymentStatusResponseWrapper | { payment?: UpdatedSalePayment } | UpdatedSalePayment>(
    CORE_API_URL,
    `/sales/${encodeURIComponent(input.saleId)}/payments/${encodeURIComponent(input.paymentId)}`,
    {
      method: "PATCH",
      body,
    },
  );

  if (payload && typeof payload === "object") {
    if ("data" in payload && payload.data?.payment) {
      return payload.data.payment;
    }

    if ("payment" in payload && payload.payment) {
      return payload.payment;
    }

    if ("id" in payload && typeof payload.id === "string") {
      return payload;
    }
  }

  throw new Error("Resposta de atualizacao de pagamento fora do contrato esperado.");
}
