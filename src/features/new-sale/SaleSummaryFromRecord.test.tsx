import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleRecord } from "@/services/commercialApi";
import * as mapSaleToFormModule from "./mapSaleToForm";
import SaleSummaryFromRecord from "./SaleSummaryFromRecord";
import { saleSummaryPropsFromRecord } from "./saleSummaryFromRecord";

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

  it("offers another try when the sale does not load", async () => {
    vi.mocked(getSaleById).mockRejectedValue(new Error("offline"));
    renderPreview();

    expect(await screen.findByText("Não foi possível carregar a venda.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(getSaleById).toHaveBeenCalledTimes(2));
  });
});
