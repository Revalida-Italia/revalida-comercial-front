import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { SalePayment, SaleRecord } from "@/services/commercialApi";
import { readStripePaymentMethod } from "@/features/sales/utils/stripePaymentMethod";
import SaleDetailPreview from "./SaleDetailPreview";

function renderPreview(record: SaleRecord) {
  return render(
    <MemoryRouter>
      <SaleDetailPreview sale={record} readOnly />
    </MemoryRouter>,
  );
}

function payment(overrides: Partial<SalePayment> = {}): SalePayment {
  return {
    id: "pay_1",
    saleId: "sale_1",
    type: "FULL_PAYMENT",
    gateway: "STRIPE",
    amount: 100,
    status: "PENDING",
    billingType: "PIX",
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

describe("SaleDetailPreview Stripe charge", () => {
  it("reads only card and pix", () => {
    expect(readStripePaymentMethod(" card ")).toBe("card");
    expect(readStripePaymentMethod("PIX")).toBe("pix");
    expect(readStripePaymentMethod("boleto")).toBeNull();
    expect(readStripePaymentMethod(null)).toBeNull();
  });

  it("shows the confirmed Stripe method and does not default to PIX", () => {
    const { rerender } = renderPreview(sale([payment({ stripePaymentMethod: "card", billingType: "PIX" })]));
    expect(screen.getByText("Cobrança: Cartão")).toBeInTheDocument();
    expect(screen.queryByText("Cobrança: PIX")).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <SaleDetailPreview sale={sale([payment({ stripePaymentMethod: "pix", billingType: "CREDIT_CARD" })])} readOnly />
      </MemoryRouter>,
    );
    expect(screen.getByText("Cobrança: PIX")).toBeInTheDocument();
    expect(screen.queryByText(/Cartão/)).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <SaleDetailPreview sale={sale([payment({ stripePaymentMethod: null, billingType: "PIX" })])} readOnly />
      </MemoryRouter>,
    );
    expect(screen.getByText("Stripe (aguardando confirmação)")).toBeInTheDocument();
    expect(screen.queryByText("Cobrança: PIX")).not.toBeInTheDocument();
    expect(screen.queryByText(/Cartão/)).not.toBeInTheDocument();
  });

  it("keeps the billing type for a non-Stripe payment", () => {
    renderPreview(sale([payment({ gateway: "ASAAS", billingType: "PIX", stripePaymentMethod: null })]));
    expect(screen.getByText("Cobrança: PIX")).toBeInTheDocument();
    expect(screen.queryByText("Stripe (aguardando confirmação)")).not.toBeInTheDocument();
  });

  it("labels card and boleto without inventing PIX", () => {
    const { rerender } = renderPreview(sale([
      payment({ gateway: "HOTMART", billingType: "CREDIT_CARD", stripePaymentMethod: undefined }),
    ]));
    expect(screen.getByText("Cobrança: Cartão")).toBeInTheDocument();
    expect(screen.queryByText("Cobrança: Cartão de Crédito")).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <SaleDetailPreview
          sale={sale([payment({ gateway: "HOTMART", billingType: "BOLETO" })])}
          readOnly
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Cobrança: Boleto")).toBeInTheDocument();

    for (const billingType of [null, undefined, "UNDEFINED"] as const) {
      rerender(
        <MemoryRouter>
          <SaleDetailPreview
            sale={sale([payment({ gateway: "HOTMART", billingType, stripePaymentMethod: undefined })])}
            readOnly
          />
        </MemoryRouter>,
      );
      expect(screen.queryByText(/Cobrança:/)).not.toBeInTheDocument();
      expect(screen.queryByText("Cobrança: PIX")).not.toBeInTheDocument();
    }
  });
});
