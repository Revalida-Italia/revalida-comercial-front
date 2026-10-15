import type { CreateProductInput, Product, UpdateProductInput } from "@/services/productsApi";

export interface ProductFormDraft {
  name: string;
  description: string;
  hotmartProductId: string;
  hotmartOfferCode: string;
  isAutonomy: boolean;
}

/** Empty text becomes null so the optional unique Hotmart id can be cleared. */
export function normalizeOptionalProductText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function buildCreateProductInput(draft: ProductFormDraft): CreateProductInput {
  const description = draft.description.trim();

  return {
    name: draft.name.trim(),
    ...(description ? { description } : {}),
    hotmartProductId: normalizeOptionalProductText(draft.hotmartProductId),
    hotmartOfferCode: normalizeOptionalProductText(draft.hotmartOfferCode),
    isAutonomy: draft.isAutonomy,
  };
}

export function buildProductUpdateInput(original: Product, draft: ProductFormDraft): UpdateProductInput {
  const payload: UpdateProductInput = {};
  const name = draft.name.trim();
  const description = draft.description.trim();
  const hotmartProductId = normalizeOptionalProductText(draft.hotmartProductId);
  const hotmartOfferCode = normalizeOptionalProductText(draft.hotmartOfferCode);
  const originalDescription = (original.description ?? "").trim();
  const originalHotmartProductId = normalizeOptionalProductText(original.hotmartProductId);
  const originalHotmartOfferCode = normalizeOptionalProductText(original.hotmartOfferCode);
  const originalIsAutonomy = Boolean(original.isAutonomy);

  if (name !== original.name) {
    payload.name = name;
  }
  if (description !== originalDescription) {
    payload.description = description;
  }
  if (hotmartProductId !== originalHotmartProductId) {
    payload.hotmartProductId = hotmartProductId;
  }
  if (hotmartOfferCode !== originalHotmartOfferCode) {
    payload.hotmartOfferCode = hotmartOfferCode;
  }
  if (draft.isAutonomy !== originalIsAutonomy) {
    payload.isAutonomy = draft.isAutonomy;
  }

  return payload;
}
