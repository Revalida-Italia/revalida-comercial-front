import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CORE_EXISTING_USER_ID_MISSING } from "@/services/contractsApi";
import SalePortalUsers from "./SalePortalUsers";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/contractsApi", async () => {
  const actual = await vi.importActual<typeof import("@/services/contractsApi")>("@/services/contractsApi");
  return {
    ...actual,
    listSaleStudents: vi.fn(),
    createSaleStudent: vi.fn(),
  };
});

const { listSaleStudents, createSaleStudent } = await import("@/services/contractsApi");

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SalePortalUsers saleId="sale-1" />
    </QueryClientProvider>,
  );
}

const student = {
  id: "st-1",
  saleId: "sale-1",
  coreUserId: "usr_1",
  cognitoSub: "cog-1",
  name: "Go",
  email: "go@example.com",
  origin: "associated" as const,
  createdByUserId: "admin-1",
  createdAt: "2026-11-16T12:00:00.000Z",
};

describe("sale portal users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps Associar usuário available and lists created or linked students", async () => {
    vi.mocked(listSaleStudents).mockResolvedValue([student]);
    renderSection();
    expect(await screen.findByRole("button", { name: "Associar usuário" })).toBeEnabled();
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("go@example.com")).toBeInTheDocument();
    expect(screen.getByText("Associado")).toBeInTheDocument();
    expect(screen.getByText("16/11/2026")).toBeInTheDocument();
  });

  it("explains when an existing account cannot be linked", async () => {
    vi.mocked(listSaleStudents).mockResolvedValue([student]);
    vi.mocked(createSaleStudent).mockRejectedValue(
      Object.assign(new Error(CORE_EXISTING_USER_ID_MISSING), { code: CORE_EXISTING_USER_ID_MISSING, status: 400 }),
    );
    renderSection();
    fireEvent.click(await screen.findByRole("button", { name: "Associar usuário" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("E-mail"), { target: { value: "lia@example.com" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Associar usuário" }));
    expect(await within(dialog).findByText("Esse e-mail já tem uma conta, mas não deu para associá-la a esta venda.")).toBeInTheDocument();
    expect(createSaleStudent).toHaveBeenCalledWith("sale-1", expect.objectContaining({ email: "lia@example.com" }));
  });
});
