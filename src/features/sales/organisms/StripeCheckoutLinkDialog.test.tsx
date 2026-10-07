import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SaleSummary from "@/features/new-sale/organisms/SaleSummary";
import type { SalePayment, SaleRecord } from "@/services/commercialApi";
import { createStripeCheckoutLink } from "@/services/paymentLinksApi";
import StripeCheckoutLinkDialog from "./StripeCheckoutLinkDialog";

vi.mock("@/services/paymentLinksApi", () => ({
  createStripeCheckoutLink: vi.fn(),
}));

vi.mock("@/services/whatsappApi", () => ({
  listWhatsappTemplates: vi.fn().mockResolvedValue([
    { id: "tpl_1", nome: "link_pagamento", categoria: "UTILITY", idioma: "pt_BR", corpo: "Oi" },
  ]),
  sendPaymentLinkWhatsapp: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const writeText = vi.fn().mockResolvedValue(undefined);

function stripePayment(overrides: Partial<SalePayment> = {}): SalePayment {
  return {
    id: "pay_1",
    saleId: "sale_1",
    type: "FULL_PAYMENT",
    gateway: "STRIPE",
    amount: 500,
    status: "PENDING",
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}

function makeSale(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "sale_1",
    sellerId: "seller_1",
    currency: "BRL",
    status: "PENDING",
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    clients: [{
      id: "client_1",
      saleId: "sale_1",
      nameCiphertext: "Ana",
      telefone: "5534999999999",
      createdAt: "2026-10-01T12:00:00.000Z",
      updatedAt: "2026-10-01T12:00:00.000Z",
    }],
    items: [],
    payments: [stripePayment()],
    commissions: [],
    ...overrides,
  };
}

function renderDialog(sale: SaleRecord, paymentId = "pay_1") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <StripeCheckoutLinkDialog sale={sale} open paymentId={paymentId} onOpenChange={() => {}} />
    </QueryClientProvider>,
  );
}

describe("StripeCheckoutLinkDialog", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("creates a BRL link without asking for an amount", async () => {
    vi.mocked(createStripeCheckoutLink).mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay_brl",
      sessionId: "cs_brl",
      expiresAt: "2026-10-08T15:00:00.000Z",
      currency: "BRL",
      originalAmount: null,
      amountBrl: 500,
    });

    renderDialog(makeSale());

    expect(screen.queryByLabelText(/Valor/)).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Moeda" })).toHaveTextContent("Real (BRL)");
    fireEvent.click(screen.getByRole("button", { name: "Gerar link Stripe" }));

    await waitFor(() => {
      expect(createStripeCheckoutLink).toHaveBeenCalledWith("sale_1", "pay_1", { currency: "BRL" });
    });
    expect(await screen.findByText("https://checkout.stripe.com/c/pay_brl")).toBeInTheDocument();
    expect(screen.getByText(/Expira em/)).toBeInTheDocument();
  });

  it("asks for an amount after selecting euro", async () => {
    renderDialog(makeSale());
    const currency = screen.getByRole("combobox", { name: "Moeda" });
    fireEvent.keyDown(currency, { key: "ArrowDown" });

    fireEvent.click(await screen.findByRole("option", { name: "Euro (EUR)" }));
    expect(screen.getByLabelText("Valor (EUR) *")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar link Stripe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Informe o valor em euro.");
    expect(createStripeCheckoutLink).not.toHaveBeenCalled();
  });

  it("requires an amount for USD and sends it", async () => {
    const sale = makeSale({
      payments: [stripePayment({ currency: "USD", originalAmount: 40 })],
    });
    renderDialog(sale);

    const amount = screen.getByLabelText("Valor (USD) *");
    expect(amount).toHaveValue("40");
    fireEvent.change(amount, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Gerar link Stripe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Informe o valor em dólar.");
    expect(createStripeCheckoutLink).not.toHaveBeenCalled();

    fireEvent.change(amount, { target: { value: "42,50" } });
    vi.mocked(createStripeCheckoutLink).mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay_usd",
      sessionId: "cs_usd",
      expiresAt: "2026-10-08T15:00:00.000Z",
      currency: "USD",
      originalAmount: 42.5,
      amountBrl: 230,
    });
    fireEvent.click(screen.getByRole("button", { name: "Gerar link Stripe" }));

    await waitFor(() => {
      expect(createStripeCheckoutLink).toHaveBeenCalledWith("sale_1", "pay_1", {
        currency: "USD",
        amount: 42.5,
      });
    });
  });

  it("shows API errors such as a gateway that is not configured or a paid payment", async () => {
    vi.mocked(createStripeCheckoutLink).mockRejectedValue(new Error("Stripe não configurado."));
    renderDialog(makeSale());

    fireEvent.click(screen.getByRole("button", { name: "Gerar link Stripe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Stripe não configurado.");

    vi.mocked(createStripeCheckoutLink).mockRejectedValue(new Error("Pagamento já pago."));
    fireEvent.click(screen.getByRole("button", { name: "Gerar link Stripe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Pagamento já pago.");
  });

  it("copies the link, generates a fresh one, and reuses the WhatsApp send dialog", async () => {
    vi.mocked(createStripeCheckoutLink)
      .mockResolvedValueOnce({
        url: "https://checkout.stripe.com/c/pay_old",
        sessionId: "cs_old",
        expiresAt: "2026-10-08T15:00:00.000Z",
        currency: "BRL",
        originalAmount: null,
        amountBrl: 500,
      })
      .mockResolvedValueOnce({
        url: "https://checkout.stripe.com/c/pay_new",
        sessionId: "cs_new",
        expiresAt: "2026-10-09T15:00:00.000Z",
        currency: "BRL",
        originalAmount: null,
        amountBrl: 500,
      });

    renderDialog(makeSale({
      payments: [stripePayment({ linkPagamento: "https://checkout.stripe.com/c/pay_existing" })],
    }));

    expect(screen.getByText("https://checkout.stripe.com/c/pay_existing")).toBeInTheDocument();
    expect(screen.getByText("Links Stripe expiram em até 24 horas.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copiar link Stripe" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay_existing");
    });

    fireEvent.click(screen.getByRole("button", { name: "Gerar novo link Stripe" }));
    expect(await screen.findByText("https://checkout.stripe.com/c/pay_old")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Gerar novo link Stripe" }));
    expect(await screen.findByText("https://checkout.stripe.com/c/pay_new")).toBeInTheDocument();
    expect(createStripeCheckoutLink).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Enviar link Stripe no WhatsApp" }));
    expect(await screen.findByRole("dialog", { name: "Enviar link no WhatsApp" })).toBeInTheDocument();
  });
});

describe("SaleSummary Stripe action", () => {
  it("offers the Stripe dialog only for Stripe payments", () => {
    const onOpenStripeCheckout = vi.fn();
    const breakdown = {
      commissionRate: 0,
      totalGross: 100,
      totalFees: 0,
      totalNet: 100,
      totalCommission: 0,
      payments: [],
    };

    const { rerender } = render(
      <SaleSummary
        filledCustomers={[]}
        saleItems={[]}
        configuredPayments={[{
          id: "pay_1",
          gateway: "STRIPE",
          paymentType: "FULL_PAYMENT",
          amount: 100,
          feeRate: 0,
          billingType: "PIX",
        }]}
        commissionBreakdown={breakdown}
        estimatedCommission={0}
        currency="BRL"
        getFeeRate={() => 0}
        paymentGrossValue={() => 100}
        onOpenStripeCheckout={onOpenStripeCheckout}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Gerar link de pagamento Stripe" }));
    expect(onOpenStripeCheckout).toHaveBeenCalledWith("pay_1");

    rerender(
      <SaleSummary
        filledCustomers={[]}
        saleItems={[]}
        configuredPayments={[{
          id: "pay_2",
          gateway: "ASAAS",
          paymentType: "FULL_PAYMENT",
          amount: 100,
          feeRate: 0,
          billingType: "PIX",
        }]}
        commissionBreakdown={breakdown}
        estimatedCommission={0}
        currency="BRL"
        getFeeRate={() => 0}
        paymentGrossValue={() => 100}
        onOpenStripeCheckout={onOpenStripeCheckout}
      />,
    );

    expect(screen.queryByRole("button", { name: "Gerar link de pagamento Stripe" })).not.toBeInTheDocument();
  });
});
