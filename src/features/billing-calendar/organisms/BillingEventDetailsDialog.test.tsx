import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { BillingCalendarEvent } from "@/features/billing-calendar/types";
import BillingEventDetailsDialog from "./BillingEventDetailsDialog";

function event(overrides: Partial<BillingCalendarEvent> = {}): BillingCalendarEvent {
  return {
    instanceId: "pay_5",
    paymentId: "pay_5",
    saleId: "sale_1",
    title: "Parcela 5",
    amount: 100,
    scheduledDate: "2026-10-05",
    status: "CANCELLED",
    paymentDate: "2026-10-05",
    commission: {
      id: "commission_5",
      amount: 10,
      status: "PENDING",
      canPay: true,
    },
    ...overrides,
  };
}

function renderDialog(item: BillingCalendarEvent) {
  return render(
    <MemoryRouter>
      <BillingEventDetailsDialog
        open
        event={item}
        canManageStatus
        canPayCommission
        onOpenChange={() => undefined}
        onMarkPaid={vi.fn()}
        onPayCommission={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("billing event details", () => {
  it("labels a cancelled charge as Cancelada and offers no pay action", () => {
    renderDialog(event());

    expect(screen.getAllByText("Cancelada").length).toBeGreaterThan(0);
    expect(screen.getByText("Comissão: Cancelada")).toBeInTheDocument();
    expect(screen.queryByText("Pendente")).not.toBeInTheDocument();
    expect(screen.queryByText("PENDING")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como pago" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar comissão como paga" })).not.toBeInTheDocument();
  });

  it("keeps a payable commission pending until it is marked paid", () => {
    renderDialog(event({
      status: "PAID",
      commission: {
        id: "commission_1",
        amount: 10,
        status: "PENDING",
        canPay: true,
        eligibleAt: "2026-10-01",
      },
    }));

    expect(screen.getByText("Comissão: Pendente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar comissão como paga" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Marcar como pendente" })).toBeInTheDocument();
  });
});