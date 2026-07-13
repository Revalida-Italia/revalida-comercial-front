import type { SaleRecord } from "@/services/commercialApi";

export type HotmartFixedLinkOption = {
  productName: string;
  url: string;
};

export const HOTMART_FIXED_LINKS: HotmartFixedLinkOption[] = [
  {
    productName: "Curso Provas e Italiano Medico",
    url: "https://pay.hotmart.com/E100016557T?checkoutMode=2",
  },
  {
    productName: "Curso Start Revalida Italia",
    url: "https://pay.hotmart.com/C100016529I?checkoutMode=2",
  },
  {
    productName: "Italiano a Quattro Mani",
    url: "https://pay.hotmart.com/U104253855C?checkoutMode=2",
  },
  {
    productName: "Programa Revalida Italia",
    url: "https://pay.hotmart.com/D100016489M?checkoutMode=2",
  },
  {
    productName: "Programa Revalida Italia + Auxilio para Decreto",
    url: "https://pay.hotmart.com/C103024583L?checkoutMode=2",
  },
  {
    productName: "Trabalhe na Italia",
    url: "https://pay.hotmart.com/T100016392L?checkoutMode=2",
  },
];

function normalizeProductName(value: string): string {
  return value.trim().toLowerCase();
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

export function findHotmartLinkByProductName(productName: string): HotmartFixedLinkOption | null {
  const normalized = normalizeProductName(productName);

  return HOTMART_FIXED_LINKS.find((option) => {
    const optionName = normalizeProductName(option.productName);
    return optionName === normalized
      || normalized.includes(optionName)
      || optionName.includes(normalized);
  }) ?? null;
}

export function getSuggestedHotmartLinkForSale(sale: SaleRecord): HotmartFixedLinkOption | null {
  const saleProductName = getHotmartProductNameFromSale(sale);
  if (!saleProductName) {
    return null;
  }

  return findHotmartLinkByProductName(saleProductName);
}

export function getHotmartLinkByUrl(url: string): HotmartFixedLinkOption | null {
  return HOTMART_FIXED_LINKS.find((option) => option.url === url) ?? null;
}

export function saleHasPaymentLink(sale: { payments?: { linkPagamento?: string | null }[] }): boolean {
  return sale.payments?.some((payment) => Boolean(payment.linkPagamento)) ?? false;
}
