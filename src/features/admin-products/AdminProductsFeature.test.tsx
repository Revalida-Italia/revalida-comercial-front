import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listProducts, updateProduct, type Product } from "@/services/productsApi";
import AdminProductsFeature from "./AdminProductsFeature";

vi.mock("@/services/productsApi", () => ({
  listProducts: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function product(): Product {
  return {
    id: "prod_autonomy",
    name: "DNN Autonomy",
    description: "Curso Start",
    hotmartProductId: "555",
    hotmartCheckoutUrl: "https://pay.hotmart.com/ABC",
    hotmartOfferCode: "oferta10",
    isAutonomy: true,
  };
}

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminProductsFeature />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("edição de produto", () => {
  beforeEach(() => {
    vi.mocked(listProducts).mockReset();
    vi.mocked(updateProduct).mockReset();
    vi.mocked(listProducts).mockResolvedValue([product()]);
    vi.mocked(updateProduct).mockResolvedValue(undefined);
  });

  it("mostra os dados Hotmart e Autonomy e envia só o que mudou", async () => {
    renderList();

    expect(await screen.findByText("DNN Autonomy")).toBeInTheDocument();
    expect(screen.getByText("Hotmart 555")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://pay.hotmart.com/ABC" })).toHaveAttribute(
      "href",
      "https://pay.hotmart.com/ABC",
    );
    expect(screen.getByText("Oferta oferta10")).toBeInTheDocument();
    expect(screen.getByText("Autonomy")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    const productId = screen.getByLabelText("ID do produto na Hotmart (opcional)");
    const checkoutUrl = screen.getByLabelText("URL de checkout Hotmart (opcional)");
    const offer = screen.getByLabelText("Código da oferta Hotmart (opcional)");
    const autonomy = screen.getByRole("checkbox", { name: "Produto Autonomy" });

    expect(productId).toHaveValue("555");
    expect(checkoutUrl).toHaveValue("https://pay.hotmart.com/ABC");
    expect(offer).toHaveValue("oferta10");
    expect(autonomy).toBeChecked();

    fireEvent.change(productId, { target: { value: "" } });
    fireEvent.change(offer, { target: { value: "nova" } });
    fireEvent.click(autonomy);
    fireEvent.click(screen.getByRole("button", { name: "Salvar alteracoes" }));

    await waitFor(() => {
      expect(updateProduct).toHaveBeenCalledWith("prod_autonomy", {
        hotmartProductId: null,
        hotmartOfferCode: "nova",
        isAutonomy: false,
      });
    });
  });

  it("não salva quando a URL de checkout é inválida e envia a URL quando ela muda", async () => {
    renderList();
    expect(await screen.findByText("DNN Autonomy")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const checkoutUrl = screen.getByLabelText("URL de checkout Hotmart (opcional)");
    fireEvent.change(checkoutUrl, { target: { value: "notaurl" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alteracoes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Informe uma URL http ou https válida.");
    expect(updateProduct).not.toHaveBeenCalled();

    fireEvent.change(checkoutUrl, { target: { value: "https://pay.hotmart.com/NOVA" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alteracoes" }));

    await waitFor(() => {
      expect(updateProduct).toHaveBeenCalledWith("prod_autonomy", {
        hotmartCheckoutUrl: "https://pay.hotmart.com/NOVA",
      });
    });
  });
});
