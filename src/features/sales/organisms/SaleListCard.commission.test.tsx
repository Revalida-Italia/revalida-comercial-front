import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { SalePayment, SaleRecord } from "@/services/commercialApi";
import SaleListCard from "./SaleListCard";

function payment(number: number, status: string): SalePayment {
  return {
    id: `pay_${number}`,
    saleId: "sale_hotmart",
    type: "SUBSCRIPTION",
    gateway: "HOTMART",
    amount: 100,
    status,
    installmentNumber: number,
    totalInstallments: 12,
    paymentDate: status === "PAID" || number === 5 ? "2026-10-05" : null,
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    commission: {
      id: `commission_${number}`,
      saleId: "sale_hotmart",
      paymentId: `pay_${number}`,
      sellerId: "seller_1",
      amount: 10,
      status: status === "CANCELLED" ? "CANCELLED" : "PENDING",
      canPay: false,
    },
  };
}

function sale(): SaleRecord {
  const payments = Array.from({ length: 12 }, (_, index) => {
    const number = index + 1;
    return payment(number, number <= 4 ? "PAID" : "CANCELLED");
  });

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
    commissions: payments.map((item) => item.commission!),
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

describe("dashboard sale card cancelled subscription", () => {
  it("translates the status, drops cancelled installments from the count, and excludes their commission", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <SaleListCard sale={sale()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.queryByText("PENDING")).not.toBeInTheDocument();
    expect(screen.getByText("4/4 assin. pagas")).toBeInTheDocument();
    expect(screen.queryByText("4/12 assin. pagas")).not.toBeInTheDocument();
    expect(screen.queryByText(/8 parcela/)).not.toBeInTheDocument();
    expect(screen.getByText("Assinatura cancelada")).toBeInTheDocument();
    expect(screen.queryByText("Assinatura quitada")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como pago" })).not.toBeInTheDocument();

    const commission = screen.getByText((_, element) => {
      const normalized = (element?.textContent ?? "").replace(/[\u00a0\u202f]/g, " ");
      return element?.classList.contains("text-primary") === true && normalized.includes("R$ 40,00");
    });
    expect((commission.textContent ?? "").replace(/[\u00a0\u202f]/g, " ")).not.toContain("120,00");
  });
});
