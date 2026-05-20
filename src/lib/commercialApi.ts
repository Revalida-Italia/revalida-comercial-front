import { apiRequest } from "@/lib/http";
import { toNumberOrZero } from "@/shared/utils/number";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

export interface Product {
  id: string;
  name: string;
  code?: string;
}

export interface GatewayPaymentOption {
  paymentType: string;
  feeRate: number;
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
}

export interface SalesListResponse {
  sales: SaleRecord[];
  summary: SalesSummary;
}

interface LegacySale {
  id: string;
  sellerId: string;
  sellerName?: string;
  customerName: string;
  productName?: string;
  amount: number;
  currency: string;
  paymentType: string;
  gateway: string;
  status: string;
  createdAt: string;
  commissionAmount?: number;
}

/** UI-facing customer type used for form state. */
export interface CreateSaleCustomer {
  name: string;
  document?: string;
}

/** API-facing client type as required by the backend schema. */
export interface CreateSaleClient {
  nameCiphertext: string;
  documentCiphertext: string;
}

export interface CreateSaleItem {
  productId: string;
  releaseDate: string;
  notes?: string;
}

export interface CreateSalePayment {
  gateway: string;
  type: string;
  amount: number;
  totalInstallments?: number;
  dueDate?: string;
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

export async function listProducts(): Promise<Product[]> {
  const payload = await apiRequest<Product[] | ListWrapper<Product>>(CORE_API_URL, "/products");
  return unwrapArray(payload);
}

export async function listGatewayFees(): Promise<GatewayFees[]> {
  const payload = await apiRequest<GatewayFees[] | ListWrapper<GatewayFees>>(CORE_API_URL, "/payment-gateways/fees");
  return unwrapArray(payload);
}

function fromLegacySales(legacySales: LegacySale[]): SalesListResponse {
  const sales: SaleRecord[] = legacySales.map((sale) => ({
    id: sale.id,
    sellerId: sale.sellerId,
    currency: sale.currency,
    contractValue: sale.amount,
    status: sale.status,
    createdAt: sale.createdAt,
    updatedAt: sale.createdAt,
    seller: {
      externalId: sale.sellerId,
      name: sale.sellerName,
    },
    clients: [{
      id: `${sale.id}-client`,
      saleId: sale.id,
      nameCiphertext: sale.customerName,
      documentCiphertext: "",
      createdAt: sale.createdAt,
      updatedAt: sale.createdAt,
    }],
    items: [{
      id: `${sale.id}-item`,
      saleId: sale.id,
      productId: "",
      releaseDate: sale.createdAt,
      createdAt: sale.createdAt,
      updatedAt: sale.createdAt,
      product: {
        id: "",
        name: sale.productName ?? "Produto",
      },
    }],
    payments: [{
      id: `${sale.id}-payment`,
      saleId: sale.id,
      type: sale.paymentType,
      gateway: sale.gateway,
      amount: sale.amount,
      status: sale.status,
      createdAt: sale.createdAt,
      updatedAt: sale.createdAt,
      commission: {
        id: `${sale.id}-commission`,
        saleId: sale.id,
        paymentId: `${sale.id}-payment`,
        sellerId: sale.sellerId,
        amount: sale.commissionAmount ?? 0,
        status: sale.status,
      },
    }],
    commissions: [{
      id: `${sale.id}-commission`,
      saleId: sale.id,
      paymentId: `${sale.id}-payment`,
      sellerId: sale.sellerId,
      amount: sale.commissionAmount ?? 0,
      status: sale.status,
    }],
  }));

  return {
    sales,
    summary: {
      totalSales: sales.length,
      totalAmount: legacySales.reduce((acc, sale) => acc + toNumberOrZero(sale.amount), 0),
      comission: legacySales.reduce((acc, sale) => acc + toNumberOrZero(sale.commissionAmount), 0),
      comissionFuture: 0,
    },
  };
}

export async function listSales(): Promise<SalesListResponse> {
  const payload = await apiRequest<
    ApiEnvelope<SalesListResponse>
    | SalesListResponse
    | ApiEnvelope<ListWrapper<LegacySale>>
    | LegacySale[]
    | ListWrapper<LegacySale>
  >(CORE_API_URL, "/sales");

  if (Array.isArray(payload)) {
    return fromLegacySales(payload);
  }

  if ("sales" in payload && Array.isArray(payload.sales) && payload.summary) {
    return payload;
  }

  if ("data" in payload && payload.data) {
    const data = payload.data;

    if (Array.isArray(data)) {
      return fromLegacySales(data as LegacySale[]);
    }

    if ("sales" in data && Array.isArray(data.sales)) {
      return {
        sales: data.sales,
        summary: data.summary ?? {
          totalSales: data.sales.length,
          totalAmount: 0,
          comission: 0,
          comissionFuture: 0,
        },
      };
    }

    if ("data" in data && Array.isArray(data.data)) {
      return fromLegacySales(data.data as LegacySale[]);
    }
  }

  if ("data" in payload && Array.isArray(payload.data)) {
    return fromLegacySales(payload.data as LegacySale[]);
  }

  return {
    sales: [],
    summary: {
      totalSales: 0,
      totalAmount: 0,
      comission: 0,
      comissionFuture: 0,
    },
  };
}

export async function createSale(input: CreateSaleInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, "/sales", {
    method: "POST",
    body: input,
  });
}
