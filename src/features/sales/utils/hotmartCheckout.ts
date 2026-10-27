type HotmartSaleLike = {
  hotmartCheckoutLink?: string | null;
  payments?: { gateway?: string | null }[] | null;
};

export const HOTMART_FIXED_LIST_WARNING =
  "Este produto não tem link Hotmart cadastrado na lista fixa.";

/** The checkout link comes from the backend fixed list, not from the product record. */
export function saleOffersHotmartCheckout(sale: HotmartSaleLike): boolean {
  if (sale.hotmartCheckoutLink?.trim()) {
    return true;
  }

  return sale.payments?.some((payment) => payment.gateway === "HOTMART") ?? false;
}
