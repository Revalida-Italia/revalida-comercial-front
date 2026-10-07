export const CHECKOUT_CURRENCIES = ["BRL", "USD", "EUR"] as const;

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

export function stripeCheckoutMethodHint(currency: CheckoutCurrency): string {
  if (currency === "BRL") {
    return "No real, o checkout aceita cartão e PIX. O PIX vale somente até o limite de US$ 3.000.";
  }

  return "Em dólar e euro, o checkout aceita somente cartão.";
}
