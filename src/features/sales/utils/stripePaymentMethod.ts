export type StripePaymentMethod = "card" | "pix";

export function readStripePaymentMethod(value: unknown): StripePaymentMethod | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "card" || normalized === "pix") {
    return normalized;
  }

  return null;
}

export function formatStripeChargeLabel(method: StripePaymentMethod | null | undefined): string {
  if (method === "card") {
    return "Cobrança: Cartão";
  }

  if (method === "pix") {
    return "Cobrança: PIX";
  }

  return "Stripe (aguardando confirmação)";
}
