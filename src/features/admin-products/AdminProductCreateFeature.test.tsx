import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProduct } from "@/services/productsApi";
import AdminProductCreateFeature from "./AdminProductCreateFeature";

vi.mock("@/services/productsApi", () => ({
  createProduct: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminProductCreateFeature />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("cadastro de produto", () => {
  beforeEach(() => {
    vi.mocked(createProduct).mockReset();
    vi.mocked(createProduct).mockResolvedValue(undefined);
  });

  it("envia hotmartProductId, hotmartOfferCode e isAutonomy para a API", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "DNN Autonomy" } });
    fireEvent.change(screen.getByLabelText("Descricao (opcional)"), { target: { value: "Curso Start" } });
    fireEvent.change(screen.getByLabelText("ID do produto na Hotmart (opcional)"), { target: { value: " 555 " } });
    fireEvent.change(screen.getByLabelText("Código da oferta Hotmart (opcional)"), { target: { value: "oferta10" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Produto Autonomy" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));

    await waitFor(() => {
      expect(createProduct).toHaveBeenCalledWith({
        name: "DNN Autonomy",
        description: "Curso Start",
        hotmartProductId: "555",
        hotmartOfferCode: "oferta10",
        isAutonomy: true,
      });
    });
  });

  it("envia os campos opcionais vazios como null e isAutonomy falso", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Mentoria" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));

    await waitFor(() => {
      expect(createProduct).toHaveBeenCalledWith({
        name: "Mentoria",
        hotmartProductId: null,
        hotmartOfferCode: null,
        isAutonomy: false,
      });
    });
  });
});
