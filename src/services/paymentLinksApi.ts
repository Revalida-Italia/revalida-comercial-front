import { apiRequest } from "@/lib/http";
import {
  buildStripeCheckoutBody,
  isCheckoutCurrency,
  type CheckoutCurrency,
  type StripeCheckoutBody,
} from "@/shared/utils/stripeCheckout";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

export interface StripeCheckoutSession {
  url: string;
  sessionId: string;
  expiresAt: string;
  currency: CheckoutCurrency;
  originalAmount: number | null;
  amountBrl: number;
}

export interface HotmartCheckoutLink {
  url: string;
}

export interface PaymentWebhookEvent {
  id: string;
  provider?: string | null;
  status?: string | null;
  eventType?: string | null;
  externalId?: string | null;
  saleId?: string | null;
  reason?: string | null;
  createdAt?: string | null;
}

export interface PaginatedPaymentWebhookEvents {
  items: PaymentWebhookEvent[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ListPaymentWebhookEventsQuery {
  status?: string;
  provider?: string;
  page?: number;
  limit?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function toFiniteNumber(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readNumber(value: unknown, fallback: number): number {
  const parsed = toFiniteNumber(value);
  return parsed == null ? fallback : parsed;
}

function unwrapStripePayload(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (isRecord(payload.data) && (payload.data.url || payload.data.sessionId)) {
    return payload.data;
  }

  return payload;
}

export function normalizeStripeCheckoutSession(payload: unknown): StripeCheckoutSession {
  const record = unwrapStripePayload(payload);
  const url = readString(record?.url);
  const sessionId = readString(record?.sessionId);
  const expiresAt = readString(record?.expiresAt);
  const currency = record?.currency;
  const amountBrl = toFiniteNumber(record?.amountBrl);

  if (!record || !url || !sessionId || !expiresAt || !isCheckoutCurrency(currency) || amountBrl == null) {
    throw new Error("Resposta de checkout Stripe fora do contrato esperado.");
  }

  return {
    url,
    sessionId,
    expiresAt,
    currency,
    originalAmount: toFiniteNumber(record.originalAmount),
    amountBrl,
  };
}

export function normalizeHotmartCheckoutLink(payload: unknown): HotmartCheckoutLink {
  const url = isRecord(payload)
    ? readString(payload.url) ?? (isRecord(payload.data) ? readString(payload.data.url) : null)
    : null;

  if (!url) {
    throw new Error("Resposta de link Hotmart fora do contrato esperado.");
  }

  return { url };
}

function normalizePaymentWebhookEvent(value: unknown, index: number): PaymentWebhookEvent {
  const record = isRecord(value) ? value : {};
  const id = readString(record.id) ?? `webhook-${index}`;

  return {
    id,
    provider: readString(record.provider),
    status: readString(record.status),
    eventType: readString(record.eventType ?? record.type),
    externalId: readString(record.externalId),
    saleId: readString(record.saleId),
    reason: readString(record.reason ?? record.message),
    createdAt: readString(record.createdAt ?? record.receivedAt),
  };
}

export function normalizePaymentWebhookEvents(
  payload: unknown,
  fallbackPage = 1,
  fallbackLimit = 20,
): PaginatedPaymentWebhookEvents {
  if (Array.isArray(payload)) {
    return {
      items: payload.map(normalizePaymentWebhookEvent),
      page: fallbackPage,
      pageSize: fallbackLimit,
      total: payload.length,
    };
  }

  if (!isRecord(payload)) {
    throw new Error("Resposta de eventos de webhook fora do contrato esperado.");
  }

  const meta = isRecord(payload.meta) ? payload.meta : undefined;
  const nested = isRecord(payload.data) ? payload.data : undefined;
  const nestedMeta = nested && isRecord(nested.meta) ? nested.meta : undefined;
  const pageMeta = nestedMeta ?? meta;

  const rawItems = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.data)
      ? payload.data
      : nested && Array.isArray(nested.items)
        ? nested.items
        : nested && Array.isArray(nested.data)
          ? nested.data
          : null;

  if (!rawItems) {
    throw new Error("Resposta de eventos de webhook fora do contrato esperado.");
  }

  return {
    items: rawItems.map(normalizePaymentWebhookEvent),
    page: readNumber(payload.page ?? nested?.page ?? pageMeta?.page, fallbackPage),
    pageSize: readNumber(
      payload.pageSize ?? payload.limit ?? nested?.pageSize ?? nested?.limit ?? pageMeta?.pageSize ?? pageMeta?.limit,
      fallbackLimit,
    ),
    total: readNumber(
      payload.total ?? payload.totalItems ?? nested?.total ?? nested?.totalItems ?? pageMeta?.total ?? pageMeta?.totalItems,
      rawItems.length,
    ),
  };
}

export async function createStripeCheckoutLink(
  saleId: string,
  paymentId: string,
  input: StripeCheckoutBody,
): Promise<StripeCheckoutSession> {
  const body = buildStripeCheckoutBody(input);
  const payload = await apiRequest<unknown>(
    CORE_API_URL,
    `/sales/${encodeURIComponent(saleId)}/payments/${encodeURIComponent(paymentId)}/stripe-checkout`,
    {
      method: "POST",
      body,
    },
  );

  return normalizeStripeCheckoutSession(payload);
}

export async function getHotmartCheckoutLink(saleId: string): Promise<HotmartCheckoutLink> {
  const payload = await apiRequest<unknown>(
    CORE_API_URL,
    `/sales/${encodeURIComponent(saleId)}/hotmart-checkout-link`,
  );

  return normalizeHotmartCheckoutLink(payload);
}

export async function listPaymentWebhookEvents(
  query: ListPaymentWebhookEventsQuery = {},
): Promise<PaginatedPaymentWebhookEvents> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.provider) params.set("provider", query.provider);
  if (query.page != null) params.set("page", String(query.page));
  if (query.limit != null) params.set("limit", String(query.limit));

  const queryString = params.toString();
  const payload = await apiRequest<unknown>(
    CORE_API_URL,
    `/payment-webhook-events${queryString ? `?${queryString}` : ""}`,
  );

  return normalizePaymentWebhookEvents(payload, query.page ?? 1, query.limit ?? 20);
}
