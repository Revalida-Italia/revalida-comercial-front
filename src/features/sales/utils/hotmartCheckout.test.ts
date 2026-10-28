import { describe, expect, it } from "vitest";
import { saleOffersHotmartCheckout } from "./hotmartCheckout";

describe("saleOffersHotmartCheckout", () => {
  it("offers the link for a Hotmart payment or a saved per-sale link", () => {
    expect(saleOffersHotmartCheckout({
      payments: [{ gateway: "HOTMART" }],
    })).toBe(true);

    expect(saleOffersHotmartCheckout({
      hotmartCheckoutLink: " https://pay.hotmart.com/SALE?xcod=sale_1 ",
      payments: [],
    })).toBe(true);
  });

  it("ignores the product record, including a leftover checkout url", () => {
    expect(saleOffersHotmartCheckout({
      hotmartCheckoutLink: null,
      payments: [{ gateway: "ASAAS" }],
      items: [{ product: { hotmartCheckoutUrl: "https://pay.hotmart.com/FIXED" } }],
    } as Parameters<typeof saleOffersHotmartCheckout>[0])).toBe(false);

    expect(saleOffersHotmartCheckout({
      hotmartCheckoutLink: "   ",
      payments: [],
    })).toBe(false);
  });
});
