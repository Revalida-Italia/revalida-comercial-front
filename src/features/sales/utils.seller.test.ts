import { describe, expect, it } from "vitest";
import type { SaleRecord } from "@/services/commercialApi";
import { mapSaleToForm } from "@/features/new-sale/mapSaleToForm";
import { getSaleSellerInfo, isSelfServiceSale, saleAllowsStripeCheckoutLink } from "./utils";

function sale(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "sale_1",
    sellerId: "seller_1",
    currency: "BRL",
    status: "PENDING",
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    clients: [],
    items: [],
    payments: [],
    commissions: [],
    seller: { name: "Ana", email: "ana@example.com" },
    ...overrides,
  };
}

describe("vendedor da venda", () => {
  it("mostra Self-service quando sellerId é nulo, mesmo sem o objeto seller", () => {
    const record = sale({ sellerId: null, channel: "SELF_SERVICE", seller: null });

    expect(isSelfServiceSale(record)).toBe(true);
    expect(getSaleSellerInfo(record)).toBe("Self-service");
    expect(mapSaleToForm(record).sellerId).toBe("");
  });

  it("mostra Self-service quando sellerId vem vazio e o canal não veio", () => {
    const record = sale({ sellerId: "  ", channel: undefined, seller: undefined });

    expect(getSaleSellerInfo(record)).toBe("Self-service");
  });

  it("mostra Self-service pelo canal mesmo que um seller residual exista", () => {
    const record = sale({ sellerId: "seller_1", channel: "SELF_SERVICE" });

    expect(getSaleSellerInfo(record)).toBe("Self-service");
  });

  it("mantém o nome do vendedor nas vendas SELLER", () => {
    expect(getSaleSellerInfo(sale({ channel: "SELLER" }))).toBe("Ana (ana@example.com)");
    expect(getSaleSellerInfo(sale({ seller: null }))).toBe("Vendedor não informado");
  });

  it("lê origin do back e esconde Link Stripe só no self-service", () => {
    const selfService = sale({ sellerId: "seller_1", origin: "SELF_SERVICE", channel: "SELLER" });
    expect(isSelfServiceSale(selfService)).toBe(true);
    expect(getSaleSellerInfo(selfService)).toBe("Self-service");
    expect(saleAllowsStripeCheckoutLink(selfService)).toBe(false);

    const byChannel = sale({ origin: undefined, channel: "SELF_SERVICE" });
    expect(saleAllowsStripeCheckoutLink(byChannel)).toBe(false);

    const seller = sale({ sellerId: null, origin: "SELLER", seller: null });
    expect(isSelfServiceSale(seller)).toBe(false);
    expect(saleAllowsStripeCheckoutLink(seller)).toBe(true);
    expect(saleAllowsStripeCheckoutLink(sale({ channel: "SELLER" }))).toBe(true);
    expect(saleAllowsStripeCheckoutLink(sale({}))).toBe(true);
  });
});
