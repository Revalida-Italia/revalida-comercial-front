import { describe, expect, it } from "vitest";
import type { SalePayment, SalePaymentCommission, SaleRecord } from "@/services/commercialApi";
import { formatPaymentChargeLabel } from "@/features/sales/utils/chargeLabel";
import {
  formatSalePaymentsProgress,
  getSaleCommissionValue,
  getSubscriptionPaymentsProgress,
  saleStatusLabel,
} from "@/features/sales/utils";

function commission(paymentId: string, status: string, amount = 10): SalePaymentCommission {
  return {
    id: `commission_${paymentId}`,
    saleId: "sale_hotmart",
    paymentId,
    sellerId: "seller_1",
    amount,
    status,
    canPay: status === "PENDING",
  };
}

function installment(number: number, status: string, commissionStatus: string): SalePayment {
  const id = `pay_${number}`;
  return {
    id,
    saleId: "sale_hotmart",
    type: "SUBSCRIPTION",
    gateway: "HOTMART",
    amount: 100,
    status,
    installmentNumber: number,
    totalInstallments: 12,
    paymentDate: status === "PAID" || number === 5 ? "2026-10-01" : null,
    billingType: number === 1 ? null : "UNDEFINED",
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    commission: commission(id, commissionStatus),
  };
}

function hotmartCancelledAtFive(): SaleRecord {
  const payments = Array.from({ length: 12 }, (_, index) => {
    const number = index + 1;
    if (number <= 4) {
      return installment(number, "PAID", number === 4 ? "PAID" : "PENDING");
    }
    return installment(number, "CANCELLED", "CANCELLED");
  });
  payments[3].commission = {
    ...payments[3].commission!,
    status: "PAID",
    paidAt: "2026-10-09T12:00:00.000Z",
    canPay: false,
  };

  return {
    id: "sale_hotmart",
    sellerId: "seller_1",
    currency: "BRL",
    status: "PENDING",
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    clients: [],
    items: [],
    payments,
    commissions: payments.map((payment) => payment.commission!),
    financialSummary: {
      grossContractValue: 1200,
      totalGatewayFees: 0,
      totalCommission: 120,
      netContractValue: 1200,
      payments: {
        total: 12,
        paid: 4,
        pending: 8,
        subscriptionTotal: 12,
        subscriptionPaid: 4,
        subscriptionPending: 8,
      },
      month: {
        grossPayments: 0,
        gatewayFees: 0,
        commission: 0,
        netReceived: 0,
        eligiblePayments: 0,
      },
    },
  };
}

describe("cancelled Hotmart subscription", () => {
  const sale = hotmartCancelledAtFive();

  it("keeps paid installment commissions and drops cancelled ones from the total", () => {
    expect(getSaleCommissionValue(sale)).toBe(40);
  });

  it("does not count cancelled installments in the subscription denominator", () => {
    expect(formatSalePaymentsProgress(sale)).toBe("4/4 assin. pagas");
    expect(getSubscriptionPaymentsProgress(sale)).toEqual({ paid: 4, total: 4, pending: 0 });
  });

  it("excludes a cancelled payment even when the commission status was left pending", () => {
    const payments = sale.payments.map((payment) => (
      payment.installmentNumber === 5 && payment.commission
        ? { ...payment, commission: { ...payment.commission, status: "PENDING", canPay: false } }
        : payment
    ));
    const withStaleCommission: SaleRecord = {
      ...sale,
      payments,
      commissions: payments.map((payment) => payment.commission!),
    };

    expect(getSaleCommissionValue(withStaleCommission)).toBe(40);
    expect(formatSalePaymentsProgress(withStaleCommission)).toBe("4/4 assin. pagas");
  });

  it("translates the sale status badge and never defaults a missing charge to PIX", () => {
    expect(saleStatusLabel("PENDING")).toBe("Pendente");
    expect(saleStatusLabel("CONCLUDED")).toBe("Concluída");
    expect(saleStatusLabel("ARCHIVED")).toBe("Arquivada");
    expect(formatPaymentChargeLabel({ gateway: "HOTMART", billingType: null })).toBeNull();
    expect(formatPaymentChargeLabel({ gateway: "HOTMART", billingType: "UNDEFINED" })).toBeNull();
    expect(formatPaymentChargeLabel({ gateway: "HOTMART", billingType: "CREDIT_CARD" })).toBe("Cobrança: Cartão");
    expect(formatPaymentChargeLabel({ gateway: "HOTMART", billingType: "BOLETO" })).toBe("Cobrança: Boleto");
    expect(formatPaymentChargeLabel({ gateway: "HOTMART", billingType: "PIX" })).toBe("Cobrança: PIX");
    expect(formatPaymentChargeLabel({
      gateway: "STRIPE",
      billingType: "PIX",
      stripePaymentMethod: "card",
    })).toBe("Cobrança: Cartão");
    expect(formatPaymentChargeLabel({
      gateway: "STRIPE",
      billingType: "PIX",
      stripePaymentMethod: null,
    })).toBe("Stripe (aguardando confirmação)");
  });
});
