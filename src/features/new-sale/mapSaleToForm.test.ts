import { describe, expect, it } from "vitest";
import type { SalePayment, SaleRecord } from "@/services/commercialApi";
import { brlAmountForSave, mapSaleToForm } from "./mapSaleToForm";

const stamp = "2026-10-14T00:00:00.000Z";

function payment(overrides: Partial<SalePayment> & Pick<SalePayment, "id" | "type" | "amount">): SalePayment {
  return {
    saleId: "sale-1",
    gateway: "WISE",
    status: "PENDING",
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function record(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "sale-1",
    sellerId: "seller-1",
    currency: "BRL",
    status: "PENDING",
    createdAt: stamp,
    updatedAt: stamp,
    clients: [],
    items: [],
    payments: [],
    commissions: [],
    ...overrides,
  };
}

const rates = { USD: 5, EUR: 9 };

describe("mapSaleToForm", () => {
  it("keeps a BRL down payment and a 6x plan in reais", () => {
    const form = mapSaleToForm(record({
      clients: [{ id: "c1", saleId: "sale-1", nameCiphertext: "Ana", phone: "11988880000", createdAt: stamp, updatedAt: stamp }],
      payments: [
        payment({ id: "entry", type: "ENTRY", amount: "800", dueDate: "2026-11-01" }),
        payment({ id: "inst", type: "INSTALLMENT", amount: "200", totalInstallments: 6, dueDate: "2026-12-01" }),
      ],
    }));

    expect(form.currency).toBe("BRL");
    expect(form.customers[0].telefone).toBe("11988880000");
    expect(form.payments.map((item) => item.inputCurrency)).toEqual(["BRL", "BRL"]);
    expect(form.payments.map((item) => item.amount)).toEqual(["800", "200"]);
    expect(form.payments.map((item) => item.billingType)).toEqual(["", ""]);
    expect(brlAmountForSave(form.payments[0], rates)).toBe(800);
    expect(brlAmountForSave(form.payments[1], rates)).toBe(200);
  });

  it("restores the EUR typed on the down payment and on each of 6 installments", () => {
    const form = mapSaleToForm(record({
      currency: "BRL",
      originalCurrency: "EUR",
      eurRateBrl: "6.42114",
      payments: [
        payment({ id: "entry", type: "ENTRY", amount: "3210.57", originalAmount: "500", dueDate: "2026-11-10" }),
        payment({ id: "inst", type: "INSTALLMENT", amount: "770.54", originalAmount: "120", totalInstallments: 6, dueDate: "2026-12-10" }),
      ],
    }));

    expect(form.payments[0]).toMatchObject({
      paymentType: "ENTRY",
      amount: "500",
      inputCurrency: "EUR",
      storedAmountBrl: 3210.57,
    });
    expect(form.payments[1]).toMatchObject({
      paymentType: "INSTALLMENT",
      amount: "120",
      inputCurrency: "EUR",
      totalInstallments: "6",
      storedAmountBrl: 770.54,
    });
    expect(brlAmountForSave(form.payments[0], rates)).toBe(3210.57);
    expect(brlAmountForSave({ ...form.payments[0], amount: "700" }, rates)).toBe(6300);
  });

  it("does not force a down payment back to BRL when the sale itself is in EUR", () => {
    const form = mapSaleToForm(record({
      currency: "EUR",
      payments: [
        payment({ id: "entry", type: "ENTRY", amount: "4321.57" }),
      ],
    }));

    expect(form.currency).toBe("EUR");
    expect(form.payments[0].inputCurrency).toBe("EUR");
    expect(form.payments[0].amount).toBe("4321.57");
    expect(brlAmountForSave(form.payments[0], rates)).toBe(4321.57);
  });
});
