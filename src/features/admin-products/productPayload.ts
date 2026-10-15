import type { CreateProductInput, Product, UpdateProductInput } from "@/services/productsApi";

export interface ProductFormDraft {
  name: string;
  description: string;
  hotmartProductId: string;
  hotmartCheckoutUrl: string;
  hotmartOfferCode: string;
  isAutonomy: boolean;
}

export const HOTMART_CHECKOUT_URL_ERROR = "Informe uma URL http ou https válida.";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Blank is allowed. Any other value must be an absolute http(s) URL. */
export function hotmartCheckoutUrlError(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalProductText(value);
  if (normalized == null) {
    return null;
  }

  return isHttpUrl(normalized) ? null : HOTMART_CHECKOUT_URL_ERROR;
}

function readHotmartCheckoutUrl(value: string): string | null {
  const error = hotmartCheckoutUrlError(value);
  if (error) {
    throw new Error(error);
  }

  return normalizeOptionalProductText(value);
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
    hotmartCheckoutUrl: readHotmartCheckoutUrl(draft.hotmartCheckoutUrl),
    hotmartOfferCode: normalizeOptionalProductText(draft.hotmartOfferCode),
    isAutonomy: draft.isAutonomy,
  };
}

export function buildProductUpdateInput(original: Product, draft: ProductFormDraft): UpdateProductInput {
  const payload: UpdateProductInput = {};
  const name = draft.name.trim();
  const description = draft.description.trim();
  const hotmartProductId = normalizeOptionalProductText(draft.hotmartProductId);
  const hotmartCheckoutUrl = readHotmartCheckoutUrl(draft.hotmartCheckoutUrl);
  const hotmartOfferCode = normalizeOptionalProductText(draft.hotmartOfferCode);
  const originalDescription = (original.description ?? "").trim();
  const originalHotmartProductId = normalizeOptionalProductText(original.hotmartProductId);
  const originalHotmartCheckoutUrl = normalizeOptionalProductText(original.hotmartCheckoutUrl);
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
  if (hotmartCheckoutUrl !== originalHotmartCheckoutUrl) {
    payload.hotmartCheckoutUrl = hotmartCheckoutUrl;
  }
  if (hotmartOfferCode !== originalHotmartOfferCode) {
    payload.hotmartOfferCode = hotmartOfferCode;
  }
  if (draft.isAutonomy !== originalIsAutonomy) {
    payload.isAutonomy = draft.isAutonomy;
  }

  return payload;
}
