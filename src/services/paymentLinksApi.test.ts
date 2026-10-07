import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/http";
import { PAYMENT_GATEWAYS } from "@/features/sales-dashboard/types";
import {
  createStripeCheckoutLink,
  getHotmartCheckoutLink,
  listPaymentWebhookEvents,
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

  it("lists unmatched Hotmart webhook events", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      data: [{ id: "evt_1", provider: "HOTMART", status: "unmatched", type: "PURCHASE_APPROVED" }],
      meta: { page: 2, limit: 10, total: 15 },
    });

    const page = await listPaymentWebhookEvents({
      status: "unmatched",
      provider: "HOTMART",
      page: 2,
      limit: 10,
    });

    expect(vi.mocked(apiRequest).mock.calls[0]?.[1]).toBe(
      "/payment-webhook-events?status=unmatched&provider=HOTMART&page=2&limit=10",
    );
    expect(page).toEqual({
      items: [{
        id: "evt_1",
        provider: "HOTMART",
        status: "unmatched",
        eventType: "PURCHASE_APPROVED",
        externalId: null,
        saleId: null,
        reason: null,
        createdAt: null,
      }],
      page: 2,
      pageSize: 10,
      total: 15,
    });
  });

  it("accepts a bare webhook event array", async () => {
    vi.mocked(apiRequest).mockResolvedValue([{ id: "evt_2", provider: "HOTMART", status: "unmatched" }]);

    const page = await listPaymentWebhookEvents({ status: "unmatched", provider: "HOTMART" });

    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(1);
    expect(page.items[0]?.id).toBe("evt_2");
  });
});
