import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMonthlyBilling } from "@/services/billingCalendarApi";
import { listUsers } from "@/services/usersApi";
import type { BillingCalendarEvent, MonthlyBillingResponse } from "./types";
import BillingCalendarFeature from "./BillingCalendarFeature";

vi.mock("@/services/billingCalendarApi", () => ({
  getMonthlyBilling: vi.fn(),
  updateSalePaymentStatus: vi.fn(),
}));

vi.mock("@/services/saleCommissionApi", () => ({
  paySalePaymentCommission: vi.fn(),
}));

vi.mock("@/services/usersApi", () => ({
  listUsers: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const now = new Date();
const month = now.getMonth() + 1;
const year = now.getFullYear();
const dayKey = `${year}-${String(month).padStart(2, "0")}-15`;

const monthTotals = {
  paidCount: 4,
  pendingCount: 2,
  overdueCount: 1,
  paidAmount: 400,
  pendingAmount: 200,
  overdueAmount: 100,
};

function cancelledEvent(): BillingCalendarEvent {
  return {
    instanceId: "pay_cancelled",
    paymentId: "pay_cancelled",
    saleId: "sale_1",
    title: "Parcela cancelada",
    amount: 500,
    scheduledDate: dayKey,
    status: "CANCELLED",
  };
}

function monthResponse(events: BillingCalendarEvent[]): MonthlyBillingResponse {
  return {
    month,
    year,
    paymentTypes: ["SUBSCRIPTION"],
    totalAmount: 700,
    totals: monthTotals,
    events,
    dailyTotals: [
      {
        date: dayKey,
        totalAmount: 700,
        count: 7,
        paidCount: 4,
        pendingCount: 2,
        overdueCount: 1,
      },
    ],
  };
}

function plain(value: string | null | undefined): string {
  return (value ?? "").replace(/[\u00a0\u202f]/g, " ");
}

function summaryCard(title: string) {
  const heading = screen.getByRole("heading", { name: title });
  const card = heading.closest("div.rounded-lg");
  if (!(card instanceof HTMLElement)) {
    throw new Error(`card ${title} not found`);
  }
  return within(card);
}

function renderFeature() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BillingCalendarFeature />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BillingCalendarFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(getMonthlyBilling).mockResolvedValue(monthResponse([cancelledEvent()]));
  });

  it("keeps server month totals when the event list is only cancelled charges", async () => {
    renderFeature();

    expect(await screen.findByText("Parcela cancelada")).toBeInTheDocument();

    expect(plain(summaryCard("Total do mes").getByText(/cobranca/).textContent)).toBe("7 cobranca(s)");
    expect(plain(summaryCard("Pendente").getByText(/cobranca/).textContent)).toBe("2 cobranca(s)");
    expect(plain(summaryCard("Pendente").getByText(/R\$/).textContent)).toContain("R$ 200,00");
    expect(plain(summaryCard("Pago").getByText(/cobranca/).textContent)).toBe("4 cobranca(s)");
    expect(plain(summaryCard("Em atraso").getByText(/cobranca/).textContent)).toBe("1 cobranca(s)");
    expect(plain(screen.getByText(/Total do dia:/).textContent)).toContain("R$ 700,00");
    expect(plain(screen.getByText(/Total do dia:/).textContent)).not.toContain("500,00");

    expect(getMonthlyBilling).toHaveBeenCalledWith({
      month,
      year,
      status: undefined,
      sellerId: undefined,
    });
  });

  it("requests status CANCELLED and still shows the server totals", async () => {
    renderFeature();
    expect(await screen.findByRole("button", { name: "Cancelada" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelada" }));

    await waitFor(() => {
      expect(getMonthlyBilling).toHaveBeenCalledWith({
        month,
        year,
        status: "CANCELLED",
        sellerId: undefined,
      });
    });

    expect(plain(summaryCard("Total do mes").getByText(/cobranca/).textContent)).toBe("7 cobranca(s)");
    expect(plain(summaryCard("Pendente").getByText(/cobranca/).textContent)).toBe("2 cobranca(s)");
    expect(plain(summaryCard("Em atraso").getByText(/cobranca/).textContent)).toBe("1 cobranca(s)");
    expect(screen.getByText("Parcela cancelada")).toBeInTheDocument();
  });
});
