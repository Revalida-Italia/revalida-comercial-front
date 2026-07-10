import type { SalePayment, SaleRecord } from "@/services/commercialApi";

export function getHotmartFixedLinkFromSale(sale: SaleRecord): string | null {
  for (const item of sale.items ?? []) {
    const url = item.product?.hotmartCheckoutUrl?.trim();
    if (url) {
      return url;
    }
  }

  return null;
}

export function getHotmartProductNameFromSale(sale: SaleRecord): string | null {
  for (const item of sale.items ?? []) {
    const name = item.product?.name?.trim();
    if (name) {
      return name;
    }
  }

  return null;
}

export function getDefaultPaymentWithoutLink(payments: SalePayment[]): SalePayment | undefined {
  return payments.find((payment) => !payment.linkPagamento) ?? payments[0];
}

export function saleHasPaymentLink(sale: { payments?: SalePayment[] }): boolean {
  return sale.payments?.some((payment) => Boolean(payment.linkPagamento)) ?? false;
}

export function saleCanUseHotmartFixedLink(sale: SaleRecord): boolean {
  return Boolean(getHotmartFixedLinkFromSale(sale));
}
