type HotmartSaleLike = {
  hotmartCheckoutLink?: string | null;
  payments?: { gateway?: string | null }[] | null;
  items?: { product?: { hotmartCheckoutUrl?: string | null } | null }[] | null;
};

export function saleOffersHotmartCheckout(sale: HotmartSaleLike): boolean {
  if (sale.hotmartCheckoutLink?.trim()) {
    return true;
  }

  if (sale.payments?.some((payment) => payment.gateway === "HOTMART")) {
    return true;
  }

  return sale.items?.some((item) => Boolean(item.product?.hotmartCheckoutUrl?.trim())) ?? false;
}
