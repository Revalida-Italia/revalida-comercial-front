import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/http";
import { retryHotmartCheckoutQuery } from "@/features/sales/utils/hotmartCheckout";

const API = "http://core.test";
const BACK_MESSAGE = "Este produto não está na lista fixa de links Hotmart.";

/** Body returned by the current comercial-back on GET /sales/:id/hotmart-checkout-link. */
const HOTMART_NOT_IN_LIST_BODY = {
  success: false,
  available: false,
  code: "HOTMART_PRODUCT_NOT_IN_FIXED_LIST",
  error: "HOTMART_PRODUCT_NOT_IN_FIXED_LIST",
  reason: "HOTMART_PRODUCT_NOT_IN_FIXED_LIST",
  message: BACK_MESSAGE,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequest error code", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps code from the real Hotmart 400 body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(400, HOTMART_NOT_IN_LIST_BODY))));

    await expect(apiRequest(API, "/sales/sale_1/hotmart-checkout-link")).rejects.toMatchObject({
      message: BACK_MESSAGE,
      code: "HOTMART_PRODUCT_NOT_IN_FIXED_LIST",
      status: 400,
    });
  });

  it("derives the code from error when the older body omits code", async () => {
    const { code, ...withoutCode } = HOTMART_NOT_IN_LIST_BODY;
    expect(code).toBe("HOTMART_PRODUCT_NOT_IN_FIXED_LIST");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(400, withoutCode))));

    const error = await apiRequest(API, "/sales/sale_1/hotmart-checkout-link").catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      message: BACK_MESSAGE,
      code: "HOTMART_PRODUCT_NOT_IN_FIXED_LIST",
      status: 400,
    });
    expect(retryHotmartCheckoutQuery(0, error, 3)).toBe(false);
  });

  it("derives HOTMART_CHECKOUT_URL_NOT_CONFIGURED from reason when error is not a string", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(400, {
      success: false,
      message: "Checkout não configurado.",
      error: { statusCode: 400 },
      reason: "HOTMART_CHECKOUT_URL_NOT_CONFIGURED",
    }))));

    const error = await apiRequest(API, "/sales/sale_1/hotmart-checkout-link").catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      code: "HOTMART_CHECKOUT_URL_NOT_CONFIGURED",
      status: 400,
    });
    expect(retryHotmartCheckoutQuery(0, error, 3)).toBe(false);
    expect(retryHotmartCheckoutQuery(0, new Error("falhou"), 3)).toBe(true);
    expect(retryHotmartCheckoutQuery(0, new Error("falhou"), false)).toBe(false);
  });
});
