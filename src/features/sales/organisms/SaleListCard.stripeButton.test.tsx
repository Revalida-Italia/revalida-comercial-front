import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { clearSession, setProfile, setSession, type UserProfile } from "@/lib/session";
import type { SalePayment, SaleRecord } from "@/services/commercialApi";
import SaleListCard from "./SaleListCard";

function profile(): UserProfile {
  return {
    sub: "user_1",
    email: "admin@example.com",
    role: "ADMIN",
    roles: ["ADMIN"],
  };
}

function payment(overrides: Partial<SalePayment> = {}): SalePayment {
  return {
    id: "pay_1",
    saleId: "sale_1",
    type: "FULL_PAYMENT",
    gateway: "STRIPE",
    amount: 100,
    status: "PENDING",
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}

function sale(payments: SalePayment[]): SaleRecord {
  return {
    id: "sale_1",
    sellerId: "seller_1",
    currency: "BRL",
    status: "PENDING",
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    clients: [],
    items: [],
    payments,
    commissions: [],
  };
}

function renderCard(record: SaleRecord) {
  setSession({ accessToken: "token" });
  setProfile(profile());
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SaleListCard sale={record} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("dashboard Link Stripe button", () => {
  afterEach(() => {
    clearSession();
  });

  it("paints only the Stripe button with the success token and the Stripe mark", () => {
    renderCard(sale([
      payment({ linkPagamento: "https://checkout.stripe.com/c/pay_existing" }),
    ]));

    const stripe = screen.getByRole("button", { name: "Link de pagamento Stripe" });
    expect(stripe).toHaveTextContent("Link Stripe");
    expect(stripe.className).toContain("hsl(var(--success))");
    expect(stripe.className).toContain("black_32%");
    expect(stripe.className).toContain("black_42%");
    expect(stripe).toHaveClass("text-success-foreground");
    expect(stripe.querySelector("svg path")?.getAttribute("d")).toMatch(/^M13\.976/);

    const viewLink = screen.getByRole("button", { name: "Ver link" });
    expect(viewLink).toHaveClass("border");
    expect(viewLink.className).not.toContain("--success");
    expect(screen.queryByRole("button", { name: "Link de pagamento" })).not.toBeInTheDocument();
  });

  it("leaves Link de pagamento unchanged when the Stripe payment has no link", () => {
    renderCard(sale([payment()]));

    const stripe = screen.getByRole("button", { name: "Link de pagamento Stripe" });
    expect(stripe.className).toContain("hsl(var(--success))");

    const asaas = screen.getByRole("button", { name: "Link de pagamento" });
    expect(asaas).toHaveClass("border");
    expect(asaas.className).not.toContain("--success");
    expect(asaas.querySelector("svg path")?.getAttribute("d") ?? "").not.toMatch(/^M13\.976/);
  });
});
