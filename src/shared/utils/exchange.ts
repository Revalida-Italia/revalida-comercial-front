import type { DisplayCurrency, ExchangeRates } from "@/services/exchangeRatesApi";

export type SaleExchangeRateSnapshot = {
  usdRateBrl?: string | number | null;
  eurRateBrl?: string | number | null;
  exchangeRateDate?: string | null;
  exchangeRateSource?: string | null;
};

export const DISPLAY_CURRENCY_OPTIONS: Array<{ value: DisplayCurrency; label: string }> = [
  { value: "BRL", label: "BRL" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
];

export function isDisplayCurrency(value: string): value is DisplayCurrency {
  return value === "BRL" || value === "USD" || value === "EUR";
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toPositiveRate(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Converte valor na moeda de entrada para BRL. `rates.USD/EUR` = BRL por 1 unidade. */
export function convertToBrl(
  amount: number,
  currency: DisplayCurrency,
  rates?: ExchangeRates | null,
): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  if (currency === "BRL") {
    return roundMoney(amount);
  }

  const rate = rates?.[currency];
  if (rate == null || rate <= 0) {
    throw new Error(`Cotação ${currency} indisponível para conversão.`);
  }

  return roundMoney(amount * rate);
}

/** Rate histórico da venda (BRL por 1 unidade da moeda). */
export function getSaleRateBrl(
  sale: SaleExchangeRateSnapshot,
  currency: Exclude<DisplayCurrency, "BRL">,
): number | null {
  return toPositiveRate(currency === "USD" ? sale.usdRateBrl : sale.eurRateBrl);
}

export function hasSaleExchangeRate(
  sale: SaleExchangeRateSnapshot,
  currency: DisplayCurrency = "USD",
): boolean {
  if (currency === "BRL") {
    return true;
  }

  return getSaleRateBrl(sale, currency) != null;
}

/**
 * Converte BRL → moeda estrangeira com o snapshot da venda.
 * amountForeign = amountBrl / rateBrl
 */
export function convertBrlWithSaleRate(
  amountBrl: number,
  currency: DisplayCurrency,
  sale: SaleExchangeRateSnapshot,
): number | null {
  if (!Number.isFinite(amountBrl)) {
    return null;
  }

  if (currency === "BRL") {
    return roundMoney(amountBrl);
  }

  const rate = getSaleRateBrl(sale, currency);
  if (rate == null) {
    return null;
  }

  return roundMoney(amountBrl / rate);
}

export function formatRateDateLabel(rateDate?: string | null): string {
  if (!rateDate) {
    return "";
  }

  const datePrefix = rateDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (datePrefix) {
    const [, year, month, day] = datePrefix;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(rateDate);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("pt-BR");
  }

  return rateDate;
}

export function formatSaleExchangeRateLabel(sale: SaleExchangeRateSnapshot): string | null {
  const usd = getSaleRateBrl(sale, "USD");
  const eur = getSaleRateBrl(sale, "EUR");

  if (usd == null && eur == null) {
    return null;
  }

  const parts: string[] = [];
  if (usd != null) {
    parts.push(`1 USD = ${usd.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
  }
  if (eur != null) {
    parts.push(`1 EUR = ${eur.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
  }

  const dateLabel = formatRateDateLabel(sale.exchangeRateDate);
  if (dateLabel) {
    parts.push(dateLabel);
  }

  if (sale.exchangeRateSource) {
    parts.push(String(sale.exchangeRateSource));
  }

  return parts.join(" · ");
}
