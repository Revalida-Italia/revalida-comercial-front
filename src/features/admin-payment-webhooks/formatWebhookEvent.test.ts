import { describe, expect, it } from "vitest";
import {
  formatWebhookAmount,
  formatWebhookAmountMismatch,
  formatWebhookDateTime,
  formatWebhookReason,
  webhookErrorMessage,
} from "./formatWebhookEvent";

describe("webhook event formatting", () => {
  it("labels known reasons in Portuguese and keeps unknown codes", () => {
    expect(formatWebhookReason("duplicate_charge")).toBe("Cobrança duplicada");
    expect(formatWebhookReason("amount_mismatch")).toBe("Valor divergente");
    expect(formatWebhookReason("second_settled_charge")).toBe("Segunda cobrança real no mesmo pagamento");
    expect(formatWebhookReason("untracked_session")).toBe("Sessão não rastreada");
    expect(formatWebhookReason("payment_not_found")).toBe("Pagamento não encontrado");
    expect(formatWebhookReason("installment_not_found")).toBe("Parcela não encontrada");
    expect(formatWebhookReason("payment_gateway_not_stripe")).toBe("Gateway do pagamento não é Stripe");
    expect(formatWebhookReason("sale_not_found")).toBe("Venda não encontrada");
    expect(formatWebhookReason("product_not_matched")).toBe("Produto não conciliado");
    expect(formatWebhookReason("payment_deleted")).toBe("Pagamento excluído");
    expect(formatWebhookReason("payment_pending")).toBe("Pagamento pendente");
    expect(formatWebhookReason("event_ignored")).toBe("Evento ignorado");
    expect(formatWebhookReason("buyer_mismatch")).toBe("buyer_mismatch");
    expect(formatWebhookReason(null)).toBe("—");
  });

  it("formats the timestamp in pt-BR for America/Sao_Paulo", () => {
    const formatted = formatWebhookDateTime("2026-10-07T15:00:00.000Z");
    expect(formatted).toContain("07/10/2026");
    expect(formatted).toContain("12:00");
  });

  it("formats minor units as currency", () => {
    expect(formatWebhookAmount(12345, "brl").replace(/\u00a0/g, " ")).toBe("R$ 123,45");
    expect(formatWebhookAmount(1000, "usd").replace(/\u00a0/g, " ")).toMatch(/US\$\s*10,00/);
    expect(formatWebhookAmount(null, "eur")).toBe("—");
  });

  it("shows expected and received amounts only for amount_mismatch", () => {
    const text = formatWebhookAmountMismatch({
      reason: "amount_mismatch",
      expectedAmount: 10000,
      expectedCurrency: "brl",
      amount: 12345,
      currency: "usd",
    })?.replace(/[\u00a0\u202f]/g, " ");

    expect(text).toMatch(/^esperado R\$ 100,00 \/ recebido US\$\s*123,45$/);
    expect(formatWebhookAmountMismatch({
      reason: "amount_mismatch",
      amount: 12345,
      currency: "brl",
    })).toBeNull();
    expect(formatWebhookAmountMismatch({
      reason: "second_settled_charge",
      expectedAmount: 10000,
      expectedCurrency: "brl",
      amount: 10000,
      currency: "brl",
    })).toBeNull();
  });

  it("maps the missing-event error", () => {
    expect(webhookErrorMessage(new Error("WEBHOOK_EVENT_NOT_FOUND"), "falha")).toBe("Evento não encontrado.");
    expect(webhookErrorMessage(new Error("Sem permissão"), "falha")).toBe("Sem permissão");
  });
});
