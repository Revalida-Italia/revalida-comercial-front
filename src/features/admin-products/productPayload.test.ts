import { describe, expect, it } from "vitest";
import type { Product } from "@/services/productsApi";
import { buildCreateProductInput, buildProductUpdateInput } from "./productPayload";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod_1",
    name: "Mentoria",
    description: "Trilha",
    hotmartProductId: "111",
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
      hotmartOfferCode: "  xyz  ",
      isAutonomy: true,
    })).toEqual({
      name: "DNN Autonomy",
      description: "Curso",
      hotmartProductId: "987",
      hotmartOfferCode: "xyz",
      isAutonomy: true,
    });

    const blank = buildCreateProductInput({
      name: "Mentoria",
      description: "   ",
      hotmartProductId: "  ",
      hotmartOfferCode: "",
      isAutonomy: false,
    });
    expect(blank).toEqual({
      name: "Mentoria",
      hotmartProductId: null,
      hotmartOfferCode: null,
      isAutonomy: false,
    });
    expect(blank).not.toHaveProperty("hotmartCheckoutUrl");
  });

  it("patches only the Hotmart and Autonomy fields that changed, clearing with null", () => {
    const patch = buildProductUpdateInput(product(), {
      name: "Mentoria",
      description: "Trilha",
      hotmartProductId: "",
      hotmartOfferCode: "nova",
      isAutonomy: true,
    });

    expect(patch).toEqual({
      hotmartProductId: null,
      hotmartOfferCode: "nova",
      isAutonomy: true,
    });
    expect(patch).not.toHaveProperty("hotmartCheckoutUrl");
  });

  it("returns an empty patch when nothing changed", () => {
    expect(buildProductUpdateInput(product({ hotmartProductId: null, isAutonomy: null }), {
      name: "Mentoria",
      description: "Trilha",
      hotmartProductId: "   ",
      hotmartOfferCode: "off",
      isAutonomy: false,
    })).toEqual({});
  });
});
