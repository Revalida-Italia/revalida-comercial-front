import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleRecord } from "@/services/commercialApi";
import * as mapSaleToFormModule from "./mapSaleToForm";
import SaleSummaryFromRecord from "./SaleSummaryFromRecord";
import { saleSummaryPropsFromRecord } from "./mapSaleRecordToSummary";

vi.mock("@/services/commercialApi", async () => {
  const actual = await vi.importActual<typeof import("@/services/commercialApi")>("@/services/commercialApi");
  return { ...actual, getSaleById: vi.fn() };
});

const { getSaleById } = await import("@/services/commercialApi");

function sale(): SaleRecord {
  return {
    id: "sale-1",
    sellerId: "seller-1",
    currency: "BRL",
    status: "PENDING",
    soldAt: "2026-10-14",
    createdAt: "2026-10-14T00:00:00.000Z",
    updatedAt: "2026-10-14T00:00:00.000Z",
    seller: { careerPlan: { name: "Ouro", individualCommissionRate: 10 } },
    clients: [
      {
        id: "c1",
        saleId: "sale-1",
        nameCiphertext: "Maria Souza",
        documentCiphertext: "123.456.789-00",
        telefone: "11988880000",
        email: "maria@example.com",
        createdAt: "2026-10-14T00:00:00.000Z",
        updatedAt: "2026-10-14T00:00:00.000Z",
      },
    ],
    items: [
      {
        id: "i1",
        saleId: "sale-1",
        productId: "prod-1",
        releaseDate: "2026-10-15",
        createdAt: "2026-10-14T00:00:00.000Z",
        updatedAt: "2026-10-14T00:00:00.000Z",
        product: { id: "prod-1", name: "Curso Start" },
      },
    ],
    payments: [
      {
        id: "p1",
        saleId: "sale-1",
        type: "FULL_PAYMENT",
        gateway: "WISE",
        amount: "1500",
        dueDate: "2026-10-20",
        status: "PENDING",
        billingType: "PIX",
        gatewayFeeRateSnapshot: 10,
        createdAt: "2026-10-14T00:00:00.000Z",
        updatedAt: "2026-10-14T00:00:00.000Z",
        commission: {
          id: "cm1",
          saleId: "sale-1",
          paymentId: "p1",
          sellerId: "seller-1",
          amount: 135,
          status: "PENDING",
        },
      },
    ],
    commissions: [
      {
        id: "cm1",
        saleId: "sale-1",
        paymentId: "p1",
        sellerId: "seller-1",
        amount: 135,
        status: "PENDING",
      },
    ],
  };
}

function renderPreview(saleId = "sale-1", client?: QueryClient) {
  const queryClient = client ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SaleSummaryFromRecord saleId={saleId} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SaleSummaryFromRecord", () => {
  it("builds the preview from the form mapping of the saved sale", () => {
    const record = sale();
    const mapped = mapSaleToFormModule.mapSaleToForm(record);
    const spy = vi.spyOn(mapSaleToFormModule, "mapSaleToForm").mockReturnValue({
      ...mapped,
      customers: [{ name: "Nome do formulário", document: "1", telefone: "11900000000", email: "" }],
    });

    const props = saleSummaryPropsFromRecord(record);

    expect(spy).toHaveBeenCalledWith(record);
    expect(props.filledCustomers[0]).toMatchObject({ name: "Nome do formulário", telefone: "11900000000" });
    expect(props.saleItems).toEqual([{ productName: "Curso Start", releaseDate: "2026-10-15" }]);
    expect(props.configuredPayments[0]).toMatchObject({
      gateway: "WISE",
      paymentType: "FULL_PAYMENT",
      amount: 1500,
      billingType: "PIX",
      feeRate: 10,
    });
    expect(props.currency).toBe("BRL");
    expect(props.estimatedCommission).toBe(135);
    expect(props.careerPlanName).toBe("Ouro");
    spy.mockRestore();
  });

  it("shows the saved client, product and amount", async () => {
    vi.mocked(getSaleById).mockResolvedValue(sale());
    renderPreview();

    expect(await screen.findByText("Maria Souza")).toBeInTheDocument();
    expect(screen.getByText("Curso Start")).toBeInTheDocument();
    expect(screen.getAllByText(/1\.500,00/).length).toBeGreaterThan(0);
    expect(getSaleById).toHaveBeenCalledTimes(1);
    expect(getSaleById).toHaveBeenCalledWith("sale-1");
  });

  it("asks the server once when two previews share the sale", async () => {
    vi.mocked(getSaleById).mockResolvedValue(sale());
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SaleSummaryFromRecord saleId="sale-1" />
        <SaleSummaryFromRecord saleId="sale-1" />
      </QueryClientProvider>,
    );

    expect(await screen.findAllByText("Maria Souza")).toHaveLength(2);
    expect(getSaleById).toHaveBeenCalledTimes(1);
  });

  it("reads a sale that is already cached", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    client.setQueryData(["sale", "sale-1"], sale());
    renderPreview("sale-1", client);

    expect(await screen.findByText("Curso Start")).toBeInTheDocument();
    expect(getSaleById).not.toHaveBeenCalled();
  });

  it("shows BRL, EUR, a 6x plan and a down payment from the sale response", async () => {
    const stamp = "2026-10-14T00:00:00.000Z";
    const base = {
      sellerId: "seller-1",
      status: "PENDING",
      soldAt: "2026-10-14",
      createdAt: stamp,
      updatedAt: stamp,
      seller: { careerPlan: { name: "Ouro", individualCommissionRate: 10 } },
      items: [{
        id: "i1",
        saleId: "sale-1",
        productId: "prod-1",
        releaseDate: "2026-10-20",
        createdAt: stamp,
        updatedAt: stamp,
        product: { id: "prod-1", name: "Curso Start" },
      }],
      commissions: [],
    };
    const line = (overrides: Record<string, unknown>) => ({
      saleId: "sale-1",
      gateway: "WISE",
      status: "PENDING",
      createdAt: stamp,
      updatedAt: stamp,
      ...overrides,
    });

    vi.mocked(getSaleById).mockResolvedValue({
      ...base,
      id: "sale-brl",
      currency: "BRL",
      clients: [{ id: "c1", saleId: "sale-brl", nameCiphertext: "Ana Lima", telefone: "11977770000", createdAt: stamp, updatedAt: stamp }],
      payments: [
        line({ id: "vista", type: "FULL_PAYMENT", amount: "1500", dueDate: "2026-10-20" }),
      ],
    } as never);
    const { unmount } = renderPreview("sale-brl");
    expect(await screen.findByText("Ana Lima")).toBeInTheDocument();
    expect(screen.getByText("11977770000")).toBeInTheDocument();
    expect(screen.getByText("Liberação: 20/10/2026")).toBeInTheDocument();
    expect(screen.getByText("Vencimento: 20/10/2026")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s*1\.500,00/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Nenhum pagamento configurado")).toBeNull();
    expect(screen.queryByText("Preencha os pagamentos para calcular")).toBeNull();
    expect(screen.queryByText(/Cobrança/)).toBeNull();
    unmount();

    vi.mocked(getSaleById).mockResolvedValue({
      ...base,
      id: "sale-brl-6",
      currency: "BRL",
      clients: [{ id: "c1", saleId: "sale-brl-6", nameCiphertext: "Bruno Dias", createdAt: stamp, updatedAt: stamp }],
      payments: [
        line({ id: "entry", type: "ENTRY", amount: "800", dueDate: "2026-11-01" }),
        line({ id: "inst", type: "INSTALLMENT", amount: "200", totalInstallments: 6, dueDate: "2026-12-01" }),
      ],
    } as never);
    const withEntrada = renderPreview("sale-brl-6");
    expect(await screen.findByText("Entrada")).toBeInTheDocument();
    expect(screen.getAllByText(/6 parcelas de R\$\s*200,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$\s*800,00/).length).toBeGreaterThan(0);
    expect(screen.queryByText("11977770000")).toBeNull();
    withEntrada.unmount();

    vi.mocked(getSaleById).mockResolvedValue({
      ...base,
      id: "sale-eur-6",
      currency: "BRL",
      originalCurrency: "EUR",
      eurRateBrl: "6.42",
      clients: [{ id: "c1", saleId: "sale-eur-6", nameCiphertext: "Chiara Rossi", phone: "+39 333 123 4567", createdAt: stamp, updatedAt: stamp }],
      payments: [
        line({ id: "inst", type: "INSTALLMENT", amount: "770.54", originalAmount: "120", totalInstallments: 6, dueDate: "2026-12-10" }),
      ],
    } as never);
    const eurSix = renderPreview("sale-eur-6");
    expect(await screen.findByText("+39 333 123 4567")).toBeInTheDocument();
    expect(screen.getAllByText(/6 parcelas de €\s*120,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/€\s*720,00/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Nenhum pagamento configurado")).toBeNull();
    eurSix.unmount();

    vi.mocked(getSaleById).mockResolvedValue({
      ...base,
      id: "sale-eur-entry",
      currency: "BRL",
      originalCurrency: "EUR",
      clients: [{ id: "c1", saleId: "sale-eur-entry", nameCiphertext: "Maria Souza", telefone: "11988880000", createdAt: stamp, updatedAt: stamp }],
      payments: [
        line({ id: "entry", type: "ENTRY", amount: "3210.57", originalAmount: "500", dueDate: "2026-11-10" }),
      ],
    } as never);
    renderPreview("sale-eur-entry");
    const entry = await screen.findByText("Entrada");
    expect(entry.closest("li")?.textContent).toMatch(/€\s*500,00/);
    expect(entry.closest("li")?.textContent).not.toMatch(/R\$/);
    expect(screen.queryByText("Preencha os pagamentos para calcular")).toBeNull();
  });

  it("offers another try when the sale does not load", async () => {
    vi.mocked(getSaleById).mockRejectedValue(new Error("offline"));
    renderPreview();

    expect(await screen.findByText("Não foi possível carregar a venda.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(getSaleById).toHaveBeenCalledTimes(2));
  });
});
