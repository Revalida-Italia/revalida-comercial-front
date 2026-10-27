import { isHotmartProductNotInFixedList } from "@/services/paymentLinksApi";

type HotmartSaleLike = {
  hotmartCheckoutLink?: string | null;
  payments?: { gateway?: string | null }[] | null;
};

type ConfiguredQueryRetry =
  | boolean
  | number
  | ((failureCount: number, error: Error) => boolean);

export const HOTMART_FIXED_LIST_WARNING =
  "Este produto não tem link Hotmart cadastrado na lista fixa.";

/** The checkout link comes from the backend fixed list, not from the product record. */
export function saleOffersHotmartCheckout(sale: HotmartSaleLike): boolean {
  if (sale.hotmartCheckoutLink?.trim()) {
    return true;
  }

  return sale.payments?.some((payment) => payment.gateway === "HOTMART") ?? false;
}

/**
 * A product missing from the fixed list is a finished answer.
 * Do not retry it; other failures keep the QueryClient's retry policy.
 */
export function retryHotmartCheckoutQuery(
  failureCount: number,
  error: unknown,
  configured?: ConfiguredQueryRetry,
): boolean {
  if (isHotmartProductNotInFixedList(error)) {
    return false;
  }

  if (typeof configured === "function") {
    return configured(failureCount, error as Error);
  }

  if (typeof configured === "number") {
    return failureCount < configured;
  }

  if (configured === false) {
    return false;
  }

  return failureCount < 3;
}
