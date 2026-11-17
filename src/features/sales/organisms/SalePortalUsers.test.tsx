import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CORE_EXISTING_USER_ID_MISSING, normalizeSaleStudents } from "@/services/contractsApi";
import SalePortalUsers from "./SalePortalUsers";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/new-sale/courses/Thumb", () => ({
  Thumb: ({ src, size }: { src: string | null; size: string }) => (
    <span data-thumb={size} data-src={src ?? ""} />
  ),
}));
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
  releases: [
    {
      kind: "module" as const,
      id: "mod-1",
      name: "Clínica médica",
      startsAt: "2026-08-20",
      thumbnailUrl: "https://cdn.example.test/mod.jpg",
    },
    {
      kind: "course" as const,
      id: "course-1",
      name: "Italiano A1",
      startsAt: "2026-09-01",
      thumbnailUrl: null,
    },
  ],
};

describe("sale student payload", () => {
  it("keeps the released courses and modules returned for each student", () => {
    const [row] = normalizeSaleStudents({
      success: true,
      data: {
        students: [{
          id: "st-1",
          email: "go@example.com",
          name: "Go",
          origin: "associated",
          releases: [
            { kind: "module", id: "mod-1", name: "Clínica médica", startsAt: "2026-08-20", thumbnailUrl: "https://cdn.example.test/mod.jpg" },
            { kind: "note", id: "x", name: "ignored" },
            { kind: "course", id: "course-1", name: "Italiano A1", startsAt: "2026-09-01", thumbnailUrl: null },
          ],
        }],
      },
    });
    expect(row.releases).toEqual([
      { kind: "module", id: "mod-1", name: "Clínica médica", startsAt: "2026-08-20", thumbnailUrl: "https://cdn.example.test/mod.jpg" },
      { kind: "course", id: "course-1", name: "Italiano A1", startsAt: "2026-09-01", thumbnailUrl: null },
    ]);
  });
});

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
    const released = screen.getByRole("list", { name: "Conteúdo liberado" });
    expect(within(released).getByText("Clínica médica")).toBeInTheDocument();
    expect(within(released).getByText("Início em 20/08/2026")).toBeInTheDocument();
    expect(within(released).getByText("Italiano A1")).toBeInTheDocument();
    expect(within(released).getByText("Início em 01/09/2026")).toBeInTheDocument();
    expect(released.querySelector("[data-src='https://cdn.example.test/mod.jpg']")).toHaveAttribute("data-thumb", "module");
    expect(released.querySelector("[data-src='']")).toHaveAttribute("data-thumb", "course");
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
