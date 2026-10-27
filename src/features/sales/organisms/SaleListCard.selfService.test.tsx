import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { SaleRecord } from "@/services/commercialApi";
import SaleListCard from "./SaleListCard";

function selfServiceSale(): SaleRecord {
  return {
    id: "sale_ss",
    sellerId: null,
    channel: "SELF_SERVICE",
    seller: null,
    currency: "BRL",
    status: "PENDING",
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    clients: [{
      id: "client_1",
      saleId: "sale_ss",
      nameCiphertext: "Maria",
      createdAt: "2026-10-01T12:00:00.000Z",
      updatedAt: "2026-10-01T12:00:00.000Z",
    }],
    items: [{
      id: "item_1",
      saleId: "sale_ss",
      productId: "prod_autonomy",
      releaseDate: "2026-10-01",
      createdAt: "2026-10-01T12:00:00.000Z",
      updatedAt: "2026-10-01T12:00:00.000Z",
      product: { id: "prod_autonomy", name: "DNN Autonomy" },
    }],
    payments: [],
    commissions: [],
  };
}

describe("listagem de vendas self-service", () => {
  it("mostra Self-service no card quando sellerId é nulo", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    expect(() => {
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <SaleListCard sale={selfServiceSale()} />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    }).not.toThrow();

    expect(screen.getByText("DNN Autonomy")).toBeInTheDocument();
    expect(screen.getByText("Self-service")).toBeInTheDocument();
    expect(screen.queryByText("Vendedor não informado")).not.toBeInTheDocument();
  });
});