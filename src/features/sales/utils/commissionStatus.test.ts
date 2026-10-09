import { describe, expect, it } from "vitest";
import {
  PAYMENT_REVERT_BLOCKED_MESSAGE,
  SALE_API_ERROR_MESSAGES,
  commissionHoldLabel,
  commissionStatusText,
  translatePaymentStatusError,
  translateSaleApiError,
} from "./commissionStatus";

describe("commission status copy", () => {
  it("translates every commission and payment error code", () => {
    const expected = {
      PAYMENT_NOT_PAID: "O pagamento ainda não está pago.",
      COMMISSION_HOLD_PERIOD: "A comissão ainda está no período de carência.",
      COMMISSION_CANCELLED: "A comissão está cancelada.",
      SALE_ARCHIVED: "A venda está arquivada.",
      COMMISSION_ALREADY_PAID: "A comissão já está paga.",
      PAYMENT_CANCELLED: "O pagamento está cancelado.",
      COMMISSION_NOT_FOUND: "Comissão não encontrada.",
      PAYMENT_NOT_FOUND: "Pagamento não encontrado.",
      SALE_NOT_FOUND: "Venda não encontrada.",
    };

    expect(SALE_API_ERROR_MESSAGES).toEqual(expected);
    for (const [code, message] of Object.entries(expected)) {
      expect(translateSaleApiError(new Error(code), "fallback")).toBe(message);
    }
  });

  it("blocks reverting a payment whose commission is already paid", () => {
    const fallback = "Erro ao atualizar status do pagamento.";
    expect(translatePaymentStatusError(new Error("COMMISSION_ALREADY_PAID"), fallback, "PENDING")).toBe(
      PAYMENT_REVERT_BLOCKED_MESSAGE,
    );
    expect(translatePaymentStatusError(new Error("PAYMENT_COMMISSION_PAID"), fallback, "PENDING")).toBe(
      PAYMENT_REVERT_BLOCKED_MESSAGE,
    );
    expect(translatePaymentStatusError(new Error("COMMISSION_ALREADY_PAID"), fallback, "PAID")).toBe(
      "A comissão já está paga.",
    );
  });

  it("does not surface an unknown raw code", () => {
    expect(translateSaleApiError(new Error("SOMETHING_ELSE"), "Não foi possível marcar a comissão como paga.")).toBe(
      "Não foi possível marcar a comissão como paga.",
    );
    expect(translateSaleApiError(new Error("Falha de rede."), "fallback")).toBe("Falha de rede.");
  });

  it("labels commission status in Portuguese, including the paid date", () => {
    expect(commissionStatusText({ status: "PENDING" })).toBe("Pendente");
    expect(commissionStatusText({ status: "CANCELLED", paidAt: "2026-10-05" })).toBe("Cancelada");
    expect(commissionStatusText({ status: "PAID", paidAt: "2026-10-02T15:00:00.000Z" })).toBe("Paga em 02/10/2026");
    expect(commissionHoldLabel("2026-10-16")).toBe("Disponível em 16/10/2026");
    expect(commissionHoldLabel(null)).toBeNull();
  });
});
