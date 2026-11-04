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

  it("shows every client name, with the full list on the title and the count when there are several", () => {
    renderCard(sale(["Maria", "João", "Ana"]));

    const lines = screen.getAllByTitle("Maria, João, Ana");
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line).toHaveTextContent("Maria, João, Ana");
      expect(line).toHaveTextContent("3");
    }
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.queryByText("Maria +2")).not.toBeInTheDocument();
  });

  it("shows a single client name without a count", () => {
    renderCard(sale(["Maria"]));

    const lines = screen.getAllByTitle("Maria");
    expect(lines.length).toBeGreaterThanOrEqual(1);
    for (const line of lines) expect(line).toHaveTextContent(/^Maria$/);
  });

  it("keeps Editar, Arquivar and Excluir on the card, with icons and the delete confirmation", () => {
    renderCard(sale(["Maria"]));

    expect(screen.queryByRole("button", { name: /Mais ações/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Mais ações")).not.toBeInTheDocument();

    const edit = screen.getByRole("link", { name: "Editar" });
    const details = screen.getByRole("link", { name: "Detalhes" });
    const archive = screen.getByRole("button", { name: "Arquivar" });
    const remove = screen.getByRole("button", { name: "Excluir" });

    expect(edit).toHaveAttribute("href", "/vendas/sale_1/editar");
    expect(details).toHaveAttribute("href", "/vendas/sale_1");
    expect(edit.querySelector("svg")).toBeTruthy();
    expect(details.querySelector("svg")).toBeTruthy();
    expect(archive.querySelector("svg")).toBeTruthy();
    expect(remove.querySelector("svg")).toBeTruthy();
    expect(remove.className).toContain("text-destructive");
    expect(screen.getByRole("button", { name: "WhatsApp" }).querySelector("svg")).toBeTruthy();

    fireEvent.click(remove);
    expect(screen.getByRole("alertdialog", { name: "Excluir venda?" })).toBeInTheDocument();
  });
});
