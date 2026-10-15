import { describe, expect, it } from "vitest";
import type { Product } from "@/services/productsApi";
import {
  HOTMART_CHECKOUT_URL_ERROR,
  buildCreateProductInput,
  buildProductUpdateInput,
  hotmartCheckoutUrlError,
} from "./productPayload";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod_1",
    name: "Mentoria",
    description: "Trilha",
    hotmartProductId: "111",
    hotmartCheckoutUrl: "https://pay.hotmart.com/OFF",
    hotmartOfferCode: "off",
    isAutonomy: false,
    ...overrides,
  };
}

describe("product payload", () => {
  it("sends the Hotmart fields and Autonomy flag on create, with blanks as null", () => {
    expect(buildCreateProductInput({
      name: "  DNN Autonomy  ",
      description: "  Curso  ",
      hotmartProductId: "  987  ",
      hotmartCheckoutUrl: "  https://pay.hotmart.com/ABC  ",
      hotmartOfferCode: "  xyz  ",
      isAutonomy: true,
    })).toEqual({
      name: "DNN Autonomy",
      description: "Curso",
      hotmartProductId: "987",
      hotmartCheckoutUrl: "https://pay.hotmart.com/ABC",
      hotmartOfferCode: "xyz",
      isAutonomy: true,
    });

    expect(buildCreateProductInput({
      name: "Mentoria",
      description: "   ",
      hotmartProductId: "  ",
      hotmartCheckoutUrl: "",
      hotmartOfferCode: "",
      isAutonomy: false,
    })).toEqual({
      name: "Mentoria",
      hotmartProductId: null,
      hotmartCheckoutUrl: null,
      hotmartOfferCode: null,
      isAutonomy: false,
    });
  });

  it("patches only the Hotmart and Autonomy fields that changed, clearing with null", () => {
    expect(buildProductUpdateInput(product(), {
      name: "Mentoria",
      description: "Trilha",
      hotmartProductId: "",
      hotmartCheckoutUrl: "https://pay.hotmart.com/NOVA",
      hotmartOfferCode: "nova",
      isAutonomy: true,
    })).toEqual({
      hotmartProductId: null,
      hotmartCheckoutUrl: "https://pay.hotmart.com/NOVA",
      hotmartOfferCode: "nova",
      isAutonomy: true,
    });
  });

  it("returns an empty patch when nothing changed", () => {
    expect(buildProductUpdateInput(product({ hotmartProductId: null, isAutonomy: null }), {
      name: "Mentoria",
      description: "Trilha",
      hotmartProductId: "   ",
      hotmartCheckoutUrl: "https://pay.hotmart.com/OFF",
      hotmartOfferCode: "off",
      isAutonomy: false,
    })).toEqual({});
  });

  it("aceita http(s), recusa URL relativa ou outro protocolo e limpa o checkout com null", () => {
    expect(hotmartCheckoutUrlError("")).toBeNull();
    expect(hotmartCheckoutUrlError("  https://pay.hotmart.com/A  ")).toBeNull();
    expect(hotmartCheckoutUrlError("http://localhost:3000/checkout")).toBeNull();
    expect(hotmartCheckoutUrlError("pay.hotmart.com/A")).toBe(HOTMART_CHECKOUT_URL_ERROR);
    expect(hotmartCheckoutUrlError("javascript:alert(1)")).toBe(HOTMART_CHECKOUT_URL_ERROR);
    expect(hotmartCheckoutUrlError("ftp://pay.hotmart.com/A")).toBe(HOTMART_CHECKOUT_URL_ERROR);

    expect(() => buildCreateProductInput({
      name: "Mentoria",
      description: "",
      hotmartProductId: "1",
      hotmartCheckoutUrl: "nao-e-url",
      hotmartOfferCode: "",
      isAutonomy: false,
    })).toThrow(HOTMART_CHECKOUT_URL_ERROR);

    expect(buildProductUpdateInput(product(), {
      name: "Mentoria",
      description: "Trilha",
      hotmartProductId: "111",
      hotmartCheckoutUrl: "   ",
      hotmartOfferCode: "off",
      isAutonomy: false,
    })).toEqual({
      hotmartCheckoutUrl: null,
    });
  });
});
