import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentWebhookEvent } from "@/services/paymentLinksApi";
import { listPaymentWebhookEvents, resolvePaymentWebhookEvent } from "@/services/paymentLinksApi";
import PaymentWebhookEventsFeature from "./PaymentWebhookEventsFeature";

vi.mock("@/services/paymentLinksApi", () => ({
  listPaymentWebhookEvents: vi.fn(),
  resolvePaymentWebhookEvent: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const writeText = vi.fn().mockResolvedValue(undefined);

function webhookEvent(overrides: Partial<PaymentWebhookEvent> = {}): PaymentWebhookEvent {
  return {
    id: "evt_1",
    provider: "STRIPE",
    eventId: "evt_stripe_1",
    eventType: "checkout.session.completed",
    status: "UNMATCHED",
    reason: "amount_mismatch",
    receivedAt: "2026-10-07T15:00:00.000Z",
    createdAt: "2026-10-07T15:00:01.000Z",
    amount: 12345,
    currency: "brl",
    buyerEmail: "ana@example.com",
    saleId: "sale_9",
    paymentId: "pay_1",
    stripeSessionId: "cs_test_123",
    stripePaymentIntentId: "pi_test_123",
    hotmartTransaction: null,
    hotmartXcod: null,
    markedPaymentIds: ["pay_1", "pay_2"],
    resolvedAt: null,
    resolvedBy: null,
    resolutionNote: null,
    ...overrides,
  };
}

function pageOf(items: PaymentWebhookEvent[], total = items.length, page = 1) {
  return { items, page, pageSize: 20, total };
}

function renderFeature() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PaymentWebhookEventsFeature />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PaymentWebhookEventsFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("loads unmatched unresolved events and formats the row", async () => {
    vi.mocked(listPaymentWebhookEvents).mockResolvedValue(pageOf([webhookEvent()]));
    renderFeature();

    expect(screen.getByRole("status")).toHaveTextContent("Carregando eventos...");
    expect(await screen.findByText("Valor divergente")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText(/07\/10\/2026/)).toHaveTextContent(/12:00/);
    expect(screen.getByText((_, element) => (
      element?.tagName === "TD"
      && (element.textContent ?? "").replace(/[\u00a0\u202f]/g, " ").includes("R$ 123,45")
    ))).toBeInTheDocument();
    expect(screen.getByLabelText("Pagamentos marcados")).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: "Ver venda" })).toHaveAttribute("href", "/vendas/sale_9");
    expect(listPaymentWebhookEvents).toHaveBeenCalledWith({
      status: "UNMATCHED",
      provider: undefined,
      resolved: false,
      page: 1,
      pageSize: 20,
    });

    expect(screen.queryByText(/esperado/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copiar sessão Stripe" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("cs_test_123");
    });
  });

  it("shows expected versus received amounts for amount_mismatch", async () => {
    vi.mocked(listPaymentWebhookEvents).mockResolvedValue(pageOf([
      webhookEvent({
        expectedAmount: 10000,
        expectedCurrency: "brl",
        amount: 12345,
        currency: "brl",
      }),
      webhookEvent({
        id: "evt_2",
        reason: "second_settled_charge",
        expectedAmount: 5000,
        expectedCurrency: "eur",
        amount: 5000,
        currency: "eur",
        saleId: null,
      }),
    ]));
    renderFeature();

    const mismatch = await screen.findByText((_, element) => {
      if (element?.tagName !== "TD") return false;
      const text = (element.textContent ?? "").replace(/[\u00a0\u202f]/g, " ");
      return text.includes("esperado R$ 100,00") && text.includes("recebido R$ 123,45");
    });
    expect(mismatch).toBeInTheDocument();
    expect(screen.getByText("Segunda cobrança real no mesmo pagamento")).toBeInTheDocument();
    expect(screen.getAllByText(/esperado/)).toHaveLength(1);
    expect(screen.queryByText(/Cobrança anterior/)).not.toBeInTheDocument();
  });

  it("shows the previous and current charges for a second settled charge", async () => {
    vi.mocked(listPaymentWebhookEvents).mockResolvedValue(pageOf([
      webhookEvent({
        reason: "second_settled_charge",
        secondSettledCharge: {
          previousPaymentIntentId: "pi_old",
          paymentIntentId: "pi_new",
          previousSessionId: "cs_old",
          sessionId: "cs_new",
        },
      }),
    ]));
    renderFeature();

    const line = (element: Element | null, label: string, intent: string, session: string) => {
      if (element?.tagName !== "P") return false;
      const text = element.textContent ?? "";
      return text.includes(label) && text.includes(intent) && text.includes(`(sessão`) && text.includes(session);
    };
    const previous = await screen.findByText((_, element) => line(element, "Cobrança anterior:", "pi_old", "cs_old"));
    const current = screen.getByText((_, element) => line(element, "Cobrança atual:", "pi_new", "cs_new"));
    expect(previous).toBeInTheDocument();
    expect(current).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copiar cobrança anterior" }));
    fireEvent.click(screen.getByRole("button", { name: "Copiar sessão anterior" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("pi_old");
      expect(writeText).toHaveBeenCalledWith("cs_old");
    });
  });

  it("applies provider, status and resolved filters", async () => {
    vi.mocked(listPaymentWebhookEvents).mockResolvedValue(pageOf([]));
    renderFeature();
    await screen.findByText("Nenhum evento de pagamento encontrado.");

    fireEvent.change(screen.getByLabelText("Provedor"), { target: { value: "HOTMART" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "ERROR" } });
    fireEvent.change(screen.getByLabelText("Resolução"), { target: { value: "all" } });

    await waitFor(() => {
      expect(listPaymentWebhookEvents).toHaveBeenCalledWith({
        status: "ERROR",
        provider: "HOTMART",
        resolved: undefined,
        page: 1,
        pageSize: 20,
      });
    });
  });

  it("paginates to the next page", async () => {
    vi.mocked(listPaymentWebhookEvents).mockResolvedValue(pageOf([webhookEvent()], 45));
    renderFeature();
    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));

    await waitFor(() => {
      expect(listPaymentWebhookEvents).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });
  });

  it("shows the list error", async () => {
    vi.mocked(listPaymentWebhookEvents).mockRejectedValue(new Error("Falha ao listar"));
    renderFeature();
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao listar");
  });

  it("marks an event as resolved and shows the resolution", async () => {
    const unresolved = webhookEvent();
    const resolved = webhookEvent({
      resolvedAt: "2026-10-07T16:00:00.000Z",
      resolvedBy: "admin@example.com",
      resolutionNote: "Conferido",
    });
    vi.mocked(listPaymentWebhookEvents)
      .mockResolvedValueOnce(pageOf([unresolved]))
      .mockResolvedValue(pageOf([resolved]));
    vi.mocked(resolvePaymentWebhookEvent).mockResolvedValue(resolved);

    renderFeature();
    fireEvent.click(await screen.findByRole("button", { name: "Marcar como resolvido" }));
    const dialog = await screen.findByRole("dialog", { name: "Marcar como resolvido" });
    fireEvent.change(within(dialog).getByLabelText("Nota"), { target: { value: "  Conferido  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Marcar como resolvido" }));

    await waitFor(() => {
      expect(resolvePaymentWebhookEvent).toHaveBeenCalledWith("evt_1", { note: "  Conferido  " });
    });
    expect(await screen.findByText("Nota: Conferido")).toBeInTheDocument();
    expect(screen.getByText("Por admin@example.com")).toBeInTheDocument();
    expect(screen.getByText(/Resolvido em/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como resolvido" })).not.toBeInTheDocument();
  });

  it("shows a not-found error from resolve", async () => {
    vi.mocked(listPaymentWebhookEvents).mockResolvedValue(pageOf([webhookEvent()]));
    vi.mocked(resolvePaymentWebhookEvent).mockRejectedValue(new Error("WEBHOOK_EVENT_NOT_FOUND"));
    renderFeature();

    fireEvent.click(await screen.findByRole("button", { name: "Marcar como resolvido" }));
    const dialog = await screen.findByRole("dialog", { name: "Marcar como resolvido" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Marcar como resolvido" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Evento não encontrado.");
  });
});
