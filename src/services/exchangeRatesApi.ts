import { apiRequest } from "@/lib/http";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

export type ExchangeCurrency = "USD" | "EUR";
export type DisplayCurrency = "BRL" | ExchangeCurrency;

export type ExchangeRates = Record<ExchangeCurrency, number>;

export type ExchangeRatesData = {
  base: "BRL";
  rateDate: string;
  fetchedAt: string;
  source: string;
  stale: boolean;
  rates: ExchangeRates;
};

type ExchangeRatesEnvelope = {
  success?: boolean;
  data?: Partial<ExchangeRatesData> & {
    rates?: Partial<ExchangeRates>;
  };
};

function toPositiveRate(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeExchangeRates(
  payload: ExchangeRatesData | ExchangeRatesEnvelope | Partial<ExchangeRatesData>,
): ExchangeRatesData {
  const data = "data" in (payload as ExchangeRatesEnvelope) && (payload as ExchangeRatesEnvelope).data
    ? (payload as ExchangeRatesEnvelope).data!
    : (payload as Partial<ExchangeRatesData>);

  const usd = toPositiveRate(data.rates?.USD);
  const eur = toPositiveRate(data.rates?.EUR);

  if (usd == null || eur == null) {
    throw new Error("Cotação de câmbio indisponível ou incompleta.");
  }

  return {
    base: "BRL",
    rateDate: typeof data.rateDate === "string" ? data.rateDate : "",
    fetchedAt: typeof data.fetchedAt === "string" ? data.fetchedAt : "",
    source: typeof data.source === "string" ? data.source : "unknown",
    stale: Boolean(data.stale),
    rates: {
      USD: usd,
      EUR: eur,
    },
  };
}

export async function fetchExchangeRates(): Promise<ExchangeRatesData> {
  const payload = await apiRequest<ExchangeRatesData | ExchangeRatesEnvelope>(
    CORE_API_URL,
    "/exchange-rates",
  );

  return normalizeExchangeRates(payload);
}
