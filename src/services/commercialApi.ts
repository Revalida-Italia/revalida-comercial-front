import { apiRequest } from "@/lib/http";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

export interface GatewayPaymentOption {
  paymentType: string;
  feeRate: string | number;
  isActive?: boolean;
}

export interface GatewayFees {
  gateway: string;
  paymentOptions: GatewayPaymentOption[];
}

export interface SaleClient {
  id: string;
  saleId: string;
  nameCiphertext: string;
  documentCiphertext?: string | null;
  telefone?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  releaseDate: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    description?: string | null;
    hotmartCheckoutUrl?: string | null;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface SalePaymentCommission {
  id: string;
  saleId: string;
  paymentId: string;
  sellerId: string;
  amount: string | number;
  dueDate?: string | null;
  status: string;
  calculatedAt?: string;
  paidAt?: string | null;
  payment?: {
    type?: string;
  };
}

export interface SalePayment {
  id: string;
  saleId: string;
  gatewayFeeId?: string | null;
  type: string;
  gateway: string;
  amount: string | number;
  dueDate?: string | null;
  paymentDate?: string | null;
  status: string;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  gatewayFeeRateSnapshot?: string | number | null;
  notes?: string | null;
  linkPagamento?: string | null;
  cobrancaExternalId?: string | null;
  billingType?: BillingType | string | null;
  ciclo?: SubscriptionCycle | string | null;
  createdAt: string;
  updatedAt: string;
  commission?: SalePaymentCommission;
  gatewayFee?: {
    id: string;
    gateway: string;
    paymentType: string;
    feeRate: string | number;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface SaleRecord {
  id: string;
  sellerId: string;
  currency: string;
  contractValue?: string | number;
  status: string;
  soldAt?: string | null;
  createdAt: string;
  updatedAt: string;
  seller?: {
    id?: string;
    externalId?: string;
    name?: string | null;
    email?: string;
    role?: string;
    careerPlan?: {
      id?: string;
      name?: string;
      individualCommissionRate?: string | number;
    };
  };
  clients: SaleClient[];
  items: SaleItem[];
  payments: SalePayment[];
  commissions: SalePaymentCommission[];
}

export interface SalesSummary {
  totalSales: number;
  totalAmount: number;
  comission?: number;
  comissionFuture?: number;
  commission?: number;
  commissionFuture?: number;
  totalFixedCostsThisMonth?: number;
}

export interface SalesListResponse {
  sales: SaleRecord[];
  summary: SalesSummary;
}

/** UI-facing customer type used for form state. */
export interface CreateSaleCustomer {
  name: string;
  document?: string;
  telefone: string;
  email?: string;
}

/** API-facing client type as required by the backend schema. */
export interface CreateSaleClient {
  nameCiphertext: string;
  documentCiphertext: string;
  telefone: string;
  email?: string;
}

export interface CreateSaleItem {
  productId: string;
  releaseDate: string;
  notes?: string;
}

export type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";

export type SubscriptionCycle =
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMIANNUALLY"
  | "YEARLY";

export interface CreateSalePayment {
  gateway: string;
  type: string;
  amount: number;
  totalInstallments?: number;
  dueDate?: string;
  billingType: BillingType;
  ciclo?: SubscriptionCycle;
  paymentDate?: string;
  status?: string;
  installmentNumber?: number;
  notes?: string;
}

export interface CreateSaleInput {
  sellerId?: string;
  currency?: string;
  status?: string;
  clients: CreateSaleClient[];
  items: CreateSaleItem[];
  payments: CreateSalePayment[];
}

export type SaleStatus = "PENDING" | "CONCLUDED" | "ARCHIVED";

export type PaymentStatus = "PENDING" | "PAID" | string;

export interface UpdateSaleClient {
  nameCiphertext: string;
  documentCiphertext?: string;
  telefone?: string;
  email?: string;
}

export interface UpdateSaleItem {
  productId: string;
  releaseDate: string;
  notes?: string;
}

export interface UpdateSalePayment {
  id?: string;
  type: string;
  gateway: string;
  amount: number;
  dueDate?: string;
  paymentDate?: string;
  status?: PaymentStatus;
  installmentNumber?: number;
  totalInstallments?: number;
  notes?: string;
  billingType?: BillingType;
  ciclo?: SubscriptionCycle;
}

export interface UpdateSaleInput {
  status?: SaleStatus;
  soldAt?: string;
  sellerId?: string;
  clients?: UpdateSaleClient[];
  items?: UpdateSaleItem[];
  payments?: UpdateSalePayment[];
}

interface ListWrapper<T> {
  data?: T[];
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
}

function unwrapArray<T>(payload: T[] | ListWrapper<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.data ?? [];
}

type ListGatewayFeesOptions = {
  includeInactive?: boolean;
};

export async function listGatewayFees(options?: ListGatewayFeesOptions): Promise<GatewayFees[]> {
  const includeInactive = options?.includeInactive ? "?includeInactive=true" : "";
  const payload = await apiRequest<GatewayFees[] | ListWrapper<GatewayFees>>(
    CORE_API_URL,
    `/payment-gateways/fees${includeInactive}`,
  );
  return unwrapArray(payload);
}

export async function updateGatewayFees(input: GatewayFees[]): Promise<void> {
  await apiRequest<void>(CORE_API_URL, "/payment-gateways/fees", {
    method: "PUT",
    body: input,
  });
}

export interface ListSalesOptions {
  searchTerm?: string;
  gateway?: string;
}

export type PaymentGateway = "NUBANK" | "HOTMART" | "PAYPAL" | "ASAAS" | "WISE";

export interface SalesDashboardRequest {
  sellerId?: string;
  gateway?: PaymentGateway;
  searchTerm?: string;
}

export interface SalesDashboardPeriod {
  period: string;
  totalSales: number;
  totalSalesAmount: number;
  totalComission: number;
  careerPlanInPeriod: string | null;
  starsInPeriod: number;
  minimumMonthlySales: number;
}

export interface SalesDashboardCareerPlanSummary {
  minimumMonthlySales: number;
  monthlyGoalSales: number;
}

export interface SalesDashboardSummary {
  careerPlan: SalesDashboardCareerPlanSummary;
}

export interface SalesDashboardResponse {
  periods: SalesDashboardPeriod[];
  summary: SalesDashboardSummary;
}

interface SalesDashboardEnvelope {
  success: boolean;
  data: {
    summary: SalesDashboardSummary;
    data: SalesDashboardPeriod[];
  };
}

function normalizeSaleRecord(sale: SaleRecord): SaleRecord {
  const payments = Array.isArray(sale.payments) ? sale.payments : [];
  const commissionsFromPayments = payments
    .map((payment) => payment.commission)
    .filter((commission): commission is SalePaymentCommission => Boolean(commission));

  return {
    ...sale,
    clients: Array.isArray(sale.clients) ? sale.clients : [],
    items: Array.isArray(sale.items) ? sale.items : [],
    payments,
    commissions: Array.isArray(sale.commissions) && sale.commissions.length > 0
      ? sale.commissions
      : commissionsFromPayments,
  };
}

function normalizeSalesListResponse(response: SalesListResponse): SalesListResponse {
  return {
    ...response,
    sales: (response.sales ?? []).map(normalizeSaleRecord),
  };
}

interface SaleByIdEnvelope {
  success?: boolean;
  data?: {
    sale?: SaleRecord;
  } & Partial<SaleRecord>;
}

export async function listSales(options?: ListSalesOptions): Promise<SalesListResponse> {
  const params = new URLSearchParams();
  if (options?.searchTerm) params.set("searchTerm", options.searchTerm);
  if (options?.gateway) params.set("gateway", options.gateway);

  const queryString = params.toString();
  const url = `/sales${queryString ? `?${queryString}` : ""}`;

  const payload = await apiRequest<ApiEnvelope<SalesListResponse> | SalesListResponse>(CORE_API_URL, url);

  if ("sales" in payload && Array.isArray(payload.sales)) {
    return normalizeSalesListResponse(payload);
  }

  if ("data" in payload && payload.data) {
    return normalizeSalesListResponse(payload.data);
  }

  throw new Error("Resposta de /sales fora do contrato esperado.");
}

export async function createSale(input: CreateSaleInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, "/sales", {
    method: "POST",
    body: input,
  });
}

function unwrapSale(payload: SaleByIdEnvelope | ApiEnvelope<SaleRecord> | SaleRecord): SaleRecord {
  if ("id" in payload && typeof payload.id === "string") {
    return normalizeSaleRecord(payload);
  }

  if ("data" in payload && payload.data) {
    const data = payload.data;

    if ("sale" in data && data.sale && typeof data.sale.id === "string") {
      return normalizeSaleRecord(data.sale);
    }

    if ("id" in data && typeof data.id === "string") {
      return normalizeSaleRecord(data as SaleRecord);
    }
  }

  throw new Error("Resposta de /sales/:id fora do contrato esperado.");
}

export async function getSaleById(id: string): Promise<SaleRecord> {
  const payload = await apiRequest<SaleByIdEnvelope | ApiEnvelope<SaleRecord> | SaleRecord>(
    CORE_API_URL,
    `/sales/${encodeURIComponent(id)}`,
  );
  return unwrapSale(payload);
}

export async function updateSale(id: string, input: UpdateSaleInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, `/sales/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

export type AsaasPaymentLinkInput = {
  type: string;
  amount: number;
  billingType: BillingType;
  dueDate: string;
  totalInstallments?: number;
  ciclo?: SubscriptionCycle;
};

function buildAsaasPaymentUpdate(
  payment: SalePayment,
  input: AsaasPaymentLinkInput,
): UpdateSalePayment {
  return {
    id: payment.id,
    type: input.type,
    gateway: "ASAAS",
    amount: input.amount,
    dueDate: input.dueDate,
    paymentDate: payment.paymentDate?.slice(0, 10) || undefined,
    status: payment.status,
    ...(payment.notes ? { notes: payment.notes } : {}),
    billingType: input.billingType,
    ...(input.ciclo ? { ciclo: input.ciclo } : {}),
    ...(input.totalInstallments ? { totalInstallments: input.totalInstallments } : {}),
    ...(payment.installmentNumber ? { installmentNumber: payment.installmentNumber } : {}),
  };
}

export async function createAsaasPaymentLinkForSale(
  saleId: string,
  paymentId: string,
  input: AsaasPaymentLinkInput,
): Promise<SaleRecord> {
  const sale = await getSaleById(saleId);
  const payment = sale.payments.find((item) => item.id === paymentId);

  if (!payment) {
    throw new Error("Pagamento não encontrado.");
  }

  if (payment.linkPagamento) {
    throw new Error("Este pagamento já possui link.");
  }

  await updateSale(saleId, {
    payments: [buildAsaasPaymentUpdate(payment, input)],
  });

  return getSaleById(saleId);
}

export async function fetchSalesDashboard(payload: SalesDashboardRequest): Promise<SalesDashboardResponse> {
  const response = await apiRequest<SalesDashboardEnvelope>(CORE_API_URL, "/sales/dashboard", {
    method: "POST",
    body: payload,
  });

  return {
    periods: response.data?.data ?? [],
    summary: {
      careerPlan: {
        minimumMonthlySales: Number(response.data?.summary?.careerPlan?.minimumMonthlySales ?? 0),
        monthlyGoalSales: Number(response.data?.summary?.careerPlan?.monthlyGoalSales ?? 0),
      },
    },
  };
}
