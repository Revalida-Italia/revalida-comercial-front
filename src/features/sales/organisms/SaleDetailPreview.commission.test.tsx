import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { SalePayment, SalePaymentCommission, SaleRecord } from "@/services/commercialApi";
import SaleDetailPreview from "./SaleDetailPreview";

function commission(
  payment: SalePayment,
  status: string,
  extras: Partial<SalePaymentCommission> = {},
): SalePaymentCommission {
  return {
    id: `commission_${payment.id}`,
    saleId: payment.saleId,
    paymentId: payment.id,
    sellerId: "seller_1",
    amount: 10,
    status,
    canPay: status === "PENDING",
    ...extras,
  };
}

function payment(number: number, status: string, commissionStatus: string, extras: Partial<SalePayment> = {}): SalePayment {
  const row: SalePayment = {
    id: `pay_${number}`,
    saleId: "sale_hotmart",
    type: "SUBSCRIPTION",
    gateway: "HOTMART",
    amount: 100,
    status,
    installmentNumber: number,
    totalInstallments: 12,
    paymentDate: status === "PAID" || number === 5 ? "2026-10-05" : null,
    billingType: "CREDIT_CARD",
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    ...extras,
  };
  row.commission = commission(row, commissionStatus, extras.commission ?? {});
  return row;
}

function cancelledSubscription(): SaleRecord {
  const payments = Array.from({ length: 12 }, (_, index) => {
    const number = index + 1;
    if (number < 4) return payment(number, "PAID", "PENDING", { commission: { canPay: true, eligibleAt: "2026-10-01" } as SalePaymentCommission });
    if (number === 4) {
      return payment(number, "PAID", "PAID", {
        commission: { canPay: false, paidAt: "2026-10-09T12:00:00.000Z" } as SalePaymentCommission,
      });
    }
    return payment(number, "CANCELLED", number === 5 ? "PENDING" : "CANCELLED");
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

function renderPreview(record: SaleRecord, props: Partial<ComponentProps<typeof SaleDetailPreview>> = {}) {
  return render(
    <MemoryRouter>
      <SaleDetailPreview sale={record} readOnly {...props} />
    </MemoryRouter>,
  );
}

function money(value: string | null | undefined): string {
  return (value ?? "").replace(/[\u00a0\u202f]/g, " ");
}

describe("sale detail commissions", () => {
  it("shows cancelled installments as Cancelada and pays only eligible commissions", () => {
    const onPayCommission = vi.fn();
    const onMarkPaymentPaid = vi.fn();
    renderPreview(cancelledSubscription(), {
      canManagePaymentStatus: true,
      canPayCommission: true,
      onMarkPaymentPaid,
      onPayCommission,
    });

    expect(screen.getAllByText("Cancelada").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Comissão: Cancelada/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Paga em 09\/10\/2026/).length).toBeGreaterThan(0);
    expect(screen.queryByText("PENDING")).not.toBeInTheDocument();
    expect(screen.queryByText("CANCELLED")).not.toBeInTheDocument();
    expect(screen.queryByText("PAID")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como pago" })).not.toBeInTheDocument();
    const revertButtons = screen.getAllByRole("button", { name: "Marcar como pendente" });
    expect(revertButtons).toHaveLength(4);
    expect(revertButtons[3]).toBeDisabled();
    expect(revertButtons.slice(0, 3).every((button) => !button.hasAttribute("disabled"))).toBe(true);
    expect(screen.getAllByText("Cobrança: Cartão")).toHaveLength(4);
    expect(screen.getByText(/Bruto total:.*400,00/)).toBeInTheDocument();
    expect(screen.queryByText(/Bruto total:.*1\.200,00/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Pago em: 2026-10-05")).toHaveLength(4);

    const payButtons = screen.getAllByRole("button", { name: "Marcar comissão como paga" });
    expect(payButtons).toHaveLength(6);
    expect(payButtons.every((button) => !button.hasAttribute("disabled"))).toBe(true);

    const total = screen.getByText((_, element) => (
      Boolean(element?.classList.contains("text-xl"))
      && money(element?.textContent).includes("R$ 40,00")
    ));
    expect(money(total.textContent)).toContain("R$ 40,00");
    expect(money(total.textContent)).not.toContain("120,00");

    fireEvent.click(payButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onPayCommission).toHaveBeenCalledWith("pay_1");
    expect(onMarkPaymentPaid).not.toHaveBeenCalled();
  });

  it("disables the commission action during the hold and shows the eligibility date", () => {
    const record = cancelledSubscription();
    record.payments = [
      payment(1, "PAID", "PENDING", {
        commission: { canPay: false, eligibleAt: "2026-10-16" } as SalePaymentCommission,
      }),
    ];
    record.commissions = [record.payments[0].commission!];

    renderPreview(record, { canPayCommission: true, onPayCommission: vi.fn() });

    const buttons = screen.getAllByRole("button", { name: "Marcar comissão como paga" });
    expect(buttons.every((button) => button.hasAttribute("disabled"))).toBe(true);
    expect(screen.getAllByText("Disponível em 16/10/2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Comissão: Pendente/).length).toBeGreaterThan(0);
  });

  it("hides the commission action from sellers", () => {
    renderPreview(cancelledSubscription(), {
      canPayCommission: false,
      onPayCommission: vi.fn(),
    });

    expect(screen.queryByRole("button", { name: "Marcar comissão como paga" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Cancelada").length).toBeGreaterThan(0);
  });
});
