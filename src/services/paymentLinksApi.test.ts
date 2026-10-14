import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/http";
import { PAYMENT_GATEWAYS } from "@/features/sales-dashboard/types";
import {
  createStripeCheckoutLink,
  getHotmartCheckoutLink,
  listPaymentWebhookEvents,
  normalizePaymentWebhookEvent,
  resolvePaymentWebhookEvent,
} from "@/services/paymentLinksApi";

vi.mock("@/lib/http", () => ({
  apiRequest: vi.fn(),
}));

const stripeSession = {
  url: "https://checkout.stripe.com/c/pay_cs_123",
  sessionId: "cs_123",
  expiresAt: "2026-10-08T12:00:00.000Z",
  currency: "USD",
  originalAmount: "40.5",
  amountBrl: "220.00",
};

describe("payment link API", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("keeps STRIPE on the gateway union used by the dashboard", () => {
    expect(PAYMENT_GATEWAYS).toEqual(["NUBANK", "HOTMART", "PAYPAL", "ASAAS", "WISE", "STRIPE"]);
  });

  it("posts a BRL Stripe checkout without amount", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ data: { ...stripeSession, currency: "BRL", originalAmount: null, amountBrl: 500 } });

    const result = await createStripeCheckoutLink("sale 1", "pay/1", { currency: "BRL" });

    expect(vi.mocked(apiRequest).mock.calls[0]?.slice(1)).toEqual([
      "/sales/sale%201/payments/pay%2F1/stripe-checkout",
      {
        method: "POST",
        body: { currency: "BRL" },
      },
    ]);
    expect(result).toMatchObject({
      url: stripeSession.url,
      sessionId: "cs_123",
      currency: "BRL",
      originalAmount: null,
      amountBrl: 500,
    });
  });

  it("posts the foreign amount and unwraps the Stripe session", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: stripeSession });

    const result = await createStripeCheckoutLink("sale_1", "pay_1", { currency: "USD", amount: 40.5 });

    expect(vi.mocked(apiRequest).mock.calls[0]?.slice(1)).toEqual([
      "/sales/sale_1/payments/pay_1/stripe-checkout",
      {
        method: "POST",
        body: { currency: "USD", amount: 40.5 },
      },
    ]);
    expect(result).toEqual({
      url: stripeSession.url,
      sessionId: "cs_123",
      expiresAt: stripeSession.expiresAt,
      currency: "USD",
      originalAmount: 40.5,
      amountBrl: 220,
    });
  });

  it("refuses USD or EUR checkout without an amount", async () => {
    await expect(createStripeCheckoutLink("sale_1", "pay_1", { currency: "EUR" })).rejects.toThrow(
      "Informe o valor em euro.",
    );
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("loads the per-sale Hotmart checkout link", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      data: { url: "https://pay.hotmart.com/X?xcod=sale_1&sck=abc" },
    });

    await expect(getHotmartCheckoutLink("sale_1")).resolves.toEqual({
      url: "https://pay.hotmart.com/X?xcod=sale_1&sck=abc",
    });
    expect(vi.mocked(apiRequest).mock.calls[0]?.[1]).toBe("/sales/sale_1/hotmart-checkout-link");
  });

  it("lists webhook events with the admin contract", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: {
        items: [{
          id: "evt_1",
          provider: "HOTMART",
          eventId: "hm_1",
          eventType: "PURCHASE_APPROVED",
          status: "UNMATCHED",
          reason: "sale_not_found",
          receivedAt: "2026-10-07T15:00:00.000Z",
          createdAt: "2026-10-07T15:00:01.000Z",
          amount: 9900,
          currency: "brl",
          expectedAmount: 15000,
          expectedCurrency: "BRL",
          buyerEmail: "ana@example.com",
          saleId: null,
          paymentId: null,
          stripeObjectId: "price_1",
          stripeObjectType: "price",
          stripeSessionId: null,
          stripePaymentIntentId: null,
          hotmartTransaction: "HP1",
          hotmartXcod: "sale_x",
          markedPaymentIds: [],
          resolvedAt: null,
          resolvedBy: null,
          resolutionNote: null,
        }],
        page: 2,
        pageSize: 10,
        total: 15,
      },
    });

    const page = await listPaymentWebhookEvents({
      status: "UNMATCHED",
      provider: "HOTMART",
      resolved: false,
      page: 2,
      pageSize: 10,
    });

    expect(vi.mocked(apiRequest).mock.calls[0]?.[1]).toBe(
      "/payment-webhook-events?status=UNMATCHED&provider=HOTMART&resolved=false&page=2&pageSize=10",
    );
    expect(page.page).toBe(2);
    expect(page.pageSize).toBe(10);
    expect(page.total).toBe(15);
    expect(page.items[0]).toMatchObject({
      id: "evt_1",
      provider: "HOTMART",
      eventId: "hm_1",
      reason: "sale_not_found",
      amount: 9900,
      currency: "brl",
      expectedAmount: 15000,
      expectedCurrency: "brl",
      hotmartTransaction: "HP1",
      stripeObjectId: "price_1",
      stripeObjectType: "price",
      stripeSessionId: null,
      markedPaymentIds: [],
    });
  });

  it("treats expected amount fields as optional", () => {
    const event = normalizePaymentWebhookEvent({ id: "evt_1", reason: "sale_not_found" });
    expect(event.expectedAmount).toBeNull();
    expect(event.expectedCurrency).toBeNull();
    expect(event.secondSettledCharge).toBeNull();
    expect(event.stripeObjectId).toBeNull();
    expect(event.stripeObjectType).toBeNull();
  });

  it("reads second settled charge ids and ignores an empty object", () => {
    const event = normalizePaymentWebhookEvent({
      id: "evt_2",
      reason: "second_settled_charge",
      secondSettledCharge: {
        previousPaymentIntentId: " pi_old ",
        paymentIntentId: "pi_new",
        previousSessionId: "cs_old",
        sessionId: "cs_new",
      },
    });
    expect(event.secondSettledCharge).toEqual({
      previousPaymentIntentId: "pi_old",
      paymentIntentId: "pi_new",
      previousSessionId: "cs_old",
      sessionId: "cs_new",
    });

    const empty = normalizePaymentWebhookEvent({
      id: "evt_3",
      secondSettledCharge: {
        previousPaymentIntentId: null,
        paymentIntentId: "",
        previousSessionId: null,
        sessionId: null,
      },
    });
    expect(empty.secondSettledCharge).toBeNull();
  });

  it("caps webhook page size at 100 and omits unresolved filters", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: { items: [], page: 1, pageSize: 100, total: 0 },
    });

    await listPaymentWebhookEvents({ pageSize: 500 });

    expect(vi.mocked(apiRequest).mock.calls[0]?.[1]).toBe(
      "/payment-webhook-events?page=1&pageSize=100",
    );
  });

  it("resolves a webhook event with an optional note", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: {
        id: "evt_1",
        provider: "STRIPE",
        eventId: "evt_stripe_1",
        eventType: "checkout.session.completed",
        status: "UNMATCHED",
        reason: "amount_mismatch",
        receivedAt: "2026-10-07T15:00:00.000Z",
        createdAt: "2026-10-07T15:00:00.000Z",
        amount: 1000,
        currency: "usd",
        buyerEmail: "ana@example.com",
        saleId: "sale_1",
        paymentId: "pay_1",
        stripeSessionId: "cs_1",
        stripePaymentIntentId: "pi_1",
        hotmartTransaction: null,
        hotmartXcod: null,
        markedPaymentIds: ["pay_1"],
        resolvedAt: "2026-10-07T16:00:00.000Z",
        resolvedBy: "admin@example.com",
        resolutionNote: "Conferido manualmente",
      },
    });

    const event = await resolvePaymentWebhookEvent("evt 1", { note: "  Conferido manualmente  " });

    expect(vi.mocked(apiRequest).mock.calls[0]?.slice(1)).toEqual([
      "/payment-webhook-events/evt%201/resolve",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { note: "Conferido manualmente" },
      },
    ]);
    expect(event.resolvedBy).toBe("admin@example.com");
    expect(event.resolutionNote).toBe("Conferido manualmente");
  });

  it("posts an empty JSON body when resolving without a note", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: { id: "evt_1", provider: "STRIPE", markedPaymentIds: [] },
    });

    await resolvePaymentWebhookEvent("evt_1");
    await resolvePaymentWebhookEvent("evt_2", { note: "   " });

    expect(vi.mocked(apiRequest).mock.calls.map((call) => call.slice(1))).toEqual([
      [
        "/payment-webhook-events/evt_1/resolve",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: {} },
      ],
      [
        "/payment-webhook-events/evt_2/resolve",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: {} },
      ],
    ]);
  });

  it("refuses a resolution note longer than 2000 characters", async () => {
    await expect(resolvePaymentWebhookEvent("evt_1", { note: "a".repeat(2001) })).rejects.toThrow(
      "A nota pode ter no máximo 2000 caracteres.",
    );
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
