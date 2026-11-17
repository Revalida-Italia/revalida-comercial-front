import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMAIL_ALREADY_EXISTS, normalizeSaleStudents } from "@/services/contractsApi";
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

  it("keeps Criar usuário available and lists students already stored, including an older linked row", async () => {
    vi.mocked(listSaleStudents).mockResolvedValue([student]);
    renderSection();
    expect(await screen.findByRole("button", { name: "Criar usuário" })).toBeEnabled();
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("go@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Associado")).not.toBeInTheDocument();
    expect(screen.queryByText("Criado")).not.toBeInTheDocument();
    expect(screen.getByText("16/11/2026")).toBeInTheDocument();
    const released = screen.getByRole("list", { name: "Liberado" });
    expect(screen.getByRole("heading", { name: "Liberado" })).toBeInTheDocument();
    expect(within(released).getByText("Clínica médica")).toBeInTheDocument();
    expect(within(released).getByText("Início em 20/08/2026")).toBeInTheDocument();
    expect(within(released).getByText("Italiano A1")).toBeInTheDocument();
    expect(within(released).getByText("Início em 01/09/2026")).toBeInTheDocument();
    expect(released.querySelector("[data-src='https://cdn.example.test/mod.jpg']")).toHaveAttribute("data-thumb", "module");
    expect(released.querySelector("[data-src='']")).toHaveAttribute("data-thumb", "course");
  });

  it("shows the sale release once when every student has the same courses", async () => {
    vi.mocked(listSaleStudents).mockResolvedValue([
      student,
      { ...student, id: "st-2", name: "Lia", email: "lia@example.com" },
    ]);
    renderSection();
    expect(await screen.findByText("Lia")).toBeInTheDocument();
    expect(screen.getAllByText("Clínica médica")).toHaveLength(1);
    expect(screen.getAllByText("Italiano A1")).toHaveLength(1);
    expect(screen.getAllByRole("list", { name: "Liberado" })).toHaveLength(1);
  });

  it("shows an inline error when the email already has an account", async () => {
    vi.mocked(listSaleStudents).mockResolvedValue([student]);
    vi.mocked(createSaleStudent).mockRejectedValue(
      Object.assign(new Error(EMAIL_ALREADY_EXISTS), { code: EMAIL_ALREADY_EXISTS, status: 409 }),
    );
    renderSection();
    fireEvent.click(await screen.findByRole("button", { name: "Criar usuário" }));
    const dialog = await screen.findByRole("dialog", { name: "Criar usuário" });
    fireEvent.change(within(dialog).getByLabelText("E-mail"), { target: { value: "lia@example.com" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Criar usuário" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Já existe uma conta com este e-mail. Use outro e-mail.");
    expect(createSaleStudent).toHaveBeenCalledWith("sale-1", expect.objectContaining({ email: "lia@example.com" }));
  });
});
