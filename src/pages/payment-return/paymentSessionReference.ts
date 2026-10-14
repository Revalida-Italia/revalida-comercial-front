const CHECKOUT_SESSION_ID = /^cs_(?:test|live)_[A-Za-z0-9]+$/;

/** Last four characters of a Checkout Session id, or null when it should stay hidden. */
export function paymentSessionReference(sessionId: string | null | undefined): string | null {
  const trimmed = sessionId?.trim() ?? "";
  if (!CHECKOUT_SESSION_ID.test(trimmed) || trimmed.length < 12) {
    return null;
  }

  return trimmed.slice(-4);
}
