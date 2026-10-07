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

export type PaymentWebhookStatus = "PROCESSED" | "UNMATCHED" | "IGNORED" | "ERROR";
export type PaymentWebhookProvider = "STRIPE" | "HOTMART";

export interface PaymentWebhookEvent {
  id: string;
  provider: string;
  eventId: string | null;
  eventType: string | null;
  status: string | null;
  reason: string | null;
  receivedAt: string | null;
  createdAt: string | null;
  amount: number | null;
  currency: string | null;
  buyerEmail: string | null;
  saleId: string | null;
  paymentId: string | null;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  hotmartTransaction: string | null;
  hotmartXcod: string | null;
  markedPaymentIds: string[];
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
}

export interface PaginatedPaymentWebhookEvents {
  items: PaymentWebhookEvent[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ListPaymentWebhookEventsQuery {
  status?: PaymentWebhookStatus | string;
  provider?: PaymentWebhookProvider | string;
  resolved?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ResolvePaymentWebhookEventInput {
  note?: string;
}

const WEBHOOK_NOTE_MAX_LENGTH = 2000;
const WEBHOOK_PAGE_SIZE_MAX = 100;

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

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function normalizePaymentWebhookEvent(value: unknown): PaymentWebhookEvent {
  if (!isRecord(value)) {
    throw new Error("Resposta de eventos de webhook fora do contrato esperado.");
  }

  const id = readString(value.id);
  if (!id) {
    throw new Error("Resposta de eventos de webhook fora do contrato esperado.");
  }

  return {
    id,
    provider: readString(value.provider) ?? "",
    eventId: readString(value.eventId),
    eventType: readString(value.eventType),
    status: readString(value.status),
    reason: readString(value.reason),
    receivedAt: readString(value.receivedAt),
    createdAt: readString(value.createdAt),
    amount: toFiniteNumber(value.amount),
    currency: readString(value.currency),
    buyerEmail: readString(value.buyerEmail),
    saleId: readString(value.saleId),
    paymentId: readString(value.paymentId),
    stripeSessionId: readString(value.stripeSessionId),
    stripePaymentIntentId: readString(value.stripePaymentIntentId),
    hotmartTransaction: readString(value.hotmartTransaction),
    hotmartXcod: readString(value.hotmartXcod),
    markedPaymentIds: readStringList(value.markedPaymentIds),
    resolvedAt: readString(value.resolvedAt),
    resolvedBy: readString(value.resolvedBy),
    resolutionNote: readString(value.resolutionNote),
  };
}

export function normalizePaymentWebhookEvents(
  payload: unknown,
  fallbackPage = 1,
  fallbackPageSize = 20,
): PaginatedPaymentWebhookEvents {
  const envelope = isRecord(payload) ? payload : null;
  const data = envelope && isRecord(envelope.data) ? envelope.data : null;
  const rawItems = data && Array.isArray(data.items) ? data.items : null;

  if (!data || !rawItems) {
    throw new Error("Resposta de eventos de webhook fora do contrato esperado.");
  }

  return {
    items: rawItems.map(normalizePaymentWebhookEvent),
    page: readNumber(data.page, fallbackPage),
    pageSize: readNumber(data.pageSize, fallbackPageSize),
    total: readNumber(data.total, rawItems.length),
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

function webhookPageSize(value: number | undefined): number {
  const pageSize = value ?? 20;
  if (!Number.isFinite(pageSize)) {
    return 20;
  }

  return Math.min(WEBHOOK_PAGE_SIZE_MAX, Math.max(1, Math.trunc(pageSize)));
}

export async function listPaymentWebhookEvents(
  query: ListPaymentWebhookEventsQuery = {},
): Promise<PaginatedPaymentWebhookEvents> {
  const page = query.page ?? 1;
  const pageSize = webhookPageSize(query.pageSize);
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.provider) params.set("provider", query.provider);
  if (query.resolved === true) params.set("resolved", "true");
  if (query.resolved === false) params.set("resolved", "false");
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  const payload = await apiRequest<unknown>(
    CORE_API_URL,
    `/payment-webhook-events?${params.toString()}`,
  );

  return normalizePaymentWebhookEvents(payload, page, pageSize);
}

export async function resolvePaymentWebhookEvent(
  id: string,
  input: ResolvePaymentWebhookEventInput = {},
): Promise<PaymentWebhookEvent> {
  const note = input.note?.trim();
  if (note && note.length > WEBHOOK_NOTE_MAX_LENGTH) {
    throw new Error("A nota pode ter no máximo 2000 caracteres.");
  }

  const payload = await apiRequest<unknown>(
    CORE_API_URL,
    `/payment-webhook-events/${encodeURIComponent(id)}/resolve`,
    {
      method: "POST",
      body: note ? { note } : {},
    },
  );

  const data = isRecord(payload) && "data" in payload ? payload.data : payload;
  return normalizePaymentWebhookEvent(data);
}
