import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setProfile } from "@/lib/session";
import NewSaleFeature from "./new-sale";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ value, onChange }: { value?: string; onChange: (value: string) => void }) => (
    <input aria-label="Selecionar data" value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
  ),
}));
vi.mock("@/services/commercialApi", async () => {
  const actual = await vi.importActual<typeof import("@/services/commercialApi")>("@/services/commercialApi");
  return {
    ...actual,
    createSale: vi.fn(),
    listGatewayFees: vi.fn(),
    createAsaasPaymentLinkForSale: vi.fn(),
  };
});
vi.mock("@/services/productsApi", async () => {
  const actual = await vi.importActual<typeof import("@/services/productsApi")>("@/services/productsApi");
  return { ...actual, listProducts: vi.fn() };
});

const { createSale, listGatewayFees } = await import("@/services/commercialApi");
const { listProducts } = await import("@/services/productsApi");
const { toast } = await import("sonner");

function renderWizard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/nova-venda"]}>
        <Routes>
          <Route path="/nova-venda" element={<NewSaleFeature />} />
          <Route path="/vendas/:id/contrato" element={<div>CONTRATO</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function pick(triggerIndex: number, optionName: string) {
  const trigger = screen.getAllByRole("combobox")[triggerIndex];
  fireEvent.pointerDown(trigger, { pointerId: 1, button: 0, pointerType: "mouse" });
  fireEvent.click(trigger);
  const option = await screen.findByRole("option", { name: optionName });
  fireEvent.click(option);
}

async function fillAndConfirm() {
  fireEvent.change(screen.getByPlaceholderText("Nome completo"), { target: { value: "Maria Souza" } });
  fireEvent.change(screen.getByPlaceholderText("5534999999999"), { target: { value: "11988880000" } });
  fireEvent.click(screen.getByRole("button", { name: "Próximo" }));

  await pick(0, "Curso Start");
  fireEvent.change(screen.getByLabelText("Selecionar data"), { target: { value: "2026-10-15" } });
  fireEvent.click(screen.getByRole("button", { name: "Próximo" }));

  await screen.findByRole("heading", { name: "Pagamentos" });
  await pick(0, "WISE");
  await pick(1, /À vista/);
  await pick(2, "PIX");
  fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "1500" } });
  const dates = screen.getAllByLabelText("Selecionar data");
  fireEvent.change(dates[dates.length - 1], { target: { value: "2026-10-20" } });
  fireEvent.click(screen.getByRole("button", { name: "Próximo" }));

  fireEvent.click(await screen.findByRole("button", { name: "Confirmar venda" }));
}

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture ??= () => false;
  HTMLElement.prototype.setPointerCapture ??= () => {};
  HTMLElement.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.mocked(listProducts).mockResolvedValue([{ id: "prod-1", name: "Curso Start" }]);
  vi.mocked(listGatewayFees).mockResolvedValue([
    { gateway: "WISE", paymentOptions: [{ paymentType: "FULL_PAYMENT", feeRate: 0 }] },
  ]);
  vi.mocked(createSale).mockResolvedValue({ id: "sale-99", payments: [] } as never);
});

describe("new sale", () => {
  it("opens the contract for the created sale when the person can generate contracts", async () => {
    setProfile({ sub: "seller-1", email: "s@example.com", name: "Seller", role: "SELLER", roles: ["SELLER"] });
    renderWizard();

    await fillAndConfirm();

    expect(await screen.findByText("CONTRATO")).toBeInTheDocument();
    expect(createSale).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Venda criada com sucesso.");
    expect(screen.queryByRole("button", { name: "Confirmar venda" })).toBeNull();
  });

  it("keeps the finished sale on the first step when the person cannot generate contracts", async () => {
    setProfile({
      sub: "costs-1",
      email: "c@example.com",
      name: "Costs",
      role: "FIXED_COSTS_MANAGER",
      roles: ["FIXED_COSTS_MANAGER"],
    });
    renderWizard();

    await fillAndConfirm();

    await waitFor(() => expect(screen.getByPlaceholderText("Nome completo")).toHaveValue(""));
    expect(screen.getByRole("heading", { name: "Clientes" })).toBeInTheDocument();
    expect(screen.queryByText("CONTRATO")).toBeNull();
    expect(screen.queryByRole("button", { name: "Confirmar venda" })).toBeNull();
    expect(screen.getByPlaceholderText("Nome completo")).toHaveValue("");
    expect(toast.success).toHaveBeenCalledWith("Venda criada com sucesso.");
    expect(createSale).toHaveBeenCalledTimes(1);
  });
});
