import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { clearSession, setProfile, setSession, type UserProfile } from "@/lib/session";
import type { SaleRecord } from "@/services/commercialApi";
import SaleListCard from "./SaleListCard";

function admin(): UserProfile {
  return { sub: "user_1", email: "admin@example.com", role: "ADMIN", roles: ["ADMIN"] };
}

function sale(names: string[]): SaleRecord {
  return {
    id: "sale_1",
    sellerId: "seller_1",
    currency: "BRL",
    status: "PENDING",
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    clients: names.map((name, index) => ({
      id: `client_${index}`,
      saleId: "sale_1",
      nameCiphertext: name,
      createdAt: "2026-10-01T12:00:00.000Z",
      updatedAt: "2026-10-01T12:00:00.000Z",
    })),
    items: [{
      id: "item_1",
      saleId: "sale_1",
      productId: "prod_1",
      releaseDate: "2026-10-01",
      createdAt: "2026-10-01T12:00:00.000Z",
      updatedAt: "2026-10-01T12:00:00.000Z",
      product: { id: "prod_1", name: "Curso Start" },
    }],
    payments: [],
    commissions: [],
  };
}

function renderCard(record: SaleRecord) {
  setSession({ accessToken: "token" });
  setProfile(admin());
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SaleListCard sale={record} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("sale list client names and actions", () => {
  afterEach(() => {
    clearSession();
  });

  it("shows the first client and a +N count, with every name on the title", () => {
    renderCard(sale(["Maria", "João", "Ana"]));

    const line = screen.getByTitle("Maria, João, Ana");
    expect(line).toHaveTextContent("Maria");
    expect(line).toHaveTextContent("+2");
    expect(line).not.toHaveTextContent("João");
    expect(screen.queryByText("Clientes")).not.toBeInTheDocument();
  });

  it("shows a single client name in the header line", () => {
    renderCard(sale(["Maria"]));
    const line = screen.getByTitle("Maria");
    expect(line).toHaveTextContent("Maria");
    expect(line).not.toHaveTextContent("+");
  });

  it("keeps Editar, Arquivar and Excluir on the card, with the delete confirmation", async () => {
    renderCard(sale(["Maria"]));

    expect(screen.getByRole("link", { name: "Detalhes" })).toHaveAttribute("href", "/vendas/sale_1");
    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute("href", "/vendas/sale_1/editar");
    expect(screen.getByRole("button", { name: "Arquivar" })).toBeInTheDocument();
    const remove = screen.getByRole("button", { name: "Excluir" });
    expect(remove.className).toContain("9A3F3F");
    expect(remove.className).not.toContain("border-destructive");

    fireEvent.click(remove);
    expect(await screen.findByRole("alertdialog", { name: "Excluir venda?" })).toBeInTheDocument();
  });
});
