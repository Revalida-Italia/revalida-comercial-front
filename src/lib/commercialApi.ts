import { apiRequest } from "@/lib/http";

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

export interface Sale {
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

export async function listSales(): Promise<Sale[]> {
  const payload = await apiRequest<Sale[] | ListWrapper<Sale>>(CORE_API_URL, "/sales");
  return unwrapArray(payload);
}

export async function createSale(input: CreateSaleInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, "/sales", {
    method: "POST",
    body: input,
  });
}
