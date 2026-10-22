import { convertBrlWithSaleRate } from "@/shared/utils/exchange";

export const CHECKOUT_CURRENCIES = ["BRL", "USD", "EUR"] as const;

export const STRIPE_PIX_USD_CAP = 3000;

export type CheckoutCurrency = (typeof CHECKOUT_CURRENCIES)[number];

export type StripeCheckoutBody = {
  currency: CheckoutCurrency;
  amount?: number;
};

export function isCheckoutCurrency(value: unknown): value is CheckoutCurrency {
  return (CHECKOUT_CURRENCIES as readonly string[]).includes(String(value));
}

export function parseCheckoutAmount(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function buildStripeCheckoutBody(input: {
  currency: CheckoutCurrency;
  amount?: number | null;
}): StripeCheckoutBody {
  if (input.currency === "BRL") {
    return { currency: "BRL" };
  }

  if (input.amount == null || !Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error(input.currency === "USD" ? "Informe o valor em dólar." : "Informe o valor em euro.");
  }

  return {
    currency: input.currency,
    amount: input.amount,
  };
}

export function brlExceedsStripePixCap(
  amountBrl: number | null | undefined,
  usdRateBrl: number | null | undefined,
): boolean {
  if (amountBrl == null || usdRateBrl == null) {
    return false;
  }

  const amountUsd = convertBrlWithSaleRate(amountBrl, "USD", { usdRateBrl });
  return amountUsd != null && amountUsd > STRIPE_PIX_USD_CAP;
}

export function stripeCheckoutMethodHint(
  currency: CheckoutCurrency,
  input?: { amountBrl?: number | null; usdRateBrl?: number | null },
): string {
  if (currency !== "BRL") {
    return "Em dólar e euro, o checkout aceita somente cartão.";
  }

  if (brlExceedsStripePixCap(input?.amountBrl, input?.usdRateBrl)) {
    return "No real, este valor fica acima de US$ 3.000. O checkout aceita somente cartão. O PIX não está disponível.";
  }

  return "No real, o checkout aceita cartão e PIX.";
}
