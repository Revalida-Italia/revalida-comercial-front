import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/http";
import { paySalePaymentCommission } from "@/services/saleCommissionApi";

vi.mock("@/lib/http", () => ({
  apiRequest: vi.fn(),
}));

describe("paySalePaymentCommission", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("patches the commission route with an empty JSON body and unwraps the payment", async () => {
    const payment = { id: "pay/1", saleId: "sale 1", status: "PAID" };
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: { payment },
    });

    const result = await paySalePaymentCommission("sale 1", "pay/1");

    expect(vi.mocked(apiRequest).mock.calls[0]?.slice(1)).toEqual([
      "/sales/sale%201/payments/pay%2F1/commission",
      {
        method: "PATCH",
        body: {},
      },
    ]);
    expect(result).toEqual(payment);
  });

  it("rejects a payload without a payment", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });

    await expect(paySalePaymentCommission("sale_1", "pay_1")).rejects.toThrow(
      "Resposta de pagamento da comissão fora do contrato esperado.",
    );
  });
});
