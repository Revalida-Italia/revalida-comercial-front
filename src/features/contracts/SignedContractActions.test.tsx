import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleContract } from "@/services/contractsApi";
import SignedContractActions from "./SignedContractActions";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/contractsApi", async () => {
  const actual = await vi.importActual<typeof import("@/services/contractsApi")>("@/services/contractsApi");
  return { ...actual, createPortalStudents: vi.fn() };
});

const { createPortalStudents } = await import("@/services/contractsApi");
const { toast } = await import("sonner");

function signedContract(overrides: Partial<SaleContract> = {}): SaleContract {
  return {
    id: "ct_1",
    saleId: "sale_1",
    productType: "PROGRAMA_REVALIDA_ITALIA",
    templateId: "tpl",
    status: "SIGNED",
    generatedAt: "2026-09-17T12:00:00.000Z",
    signedAt: "2026-09-17T15:00:00.000Z",
    signedContract: { id: "sc_1" },
    signers: [
      { id: "s1", name: "Ana Souza", email: "ana@revalida.com", recipientId: 1, coreUserId: null },
      { id: "s2", name: "João Lima", email: "joao@revalida.com", recipientId: 2, coreUserId: null },
    ],
    ...overrides,
  };
}

function renderActions(contract: SaleContract) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SignedContractActions contract={contract} />
    </QueryClientProvider>,
  );
}

describe("SignedContractActions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing when the contract is not signed", () => {
    const { container } = renderActions(signedContract({ status: "GENERATED", signedAt: null, signedContract: null }));
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the access button and never mentions a password or the mechanism", () => {
    const { container } = renderActions(signedContract());
    expect(screen.getByRole("button", { name: "Criar acesso dos alunos" })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/senha|Primeironome|core/i);
  });

  it("asks for confirmation naming the people, without any password pattern", async () => {
    renderActions(signedContract());
    fireEvent.click(screen.getByRole("button", { name: "Criar acesso dos alunos" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Ana Souza (ana@revalida.com)");
    expect(dialog).toHaveTextContent("João Lima (joao@revalida.com)");
    expect(dialog.textContent).not.toMatch(/senha|Primeironome|core|@\d{4}/i);
    expect(createPortalStudents).not.toHaveBeenCalled();
  });

  it("creates the access and reports the count in plain Portuguese", async () => {
    vi.mocked(createPortalStudents).mockResolvedValue({
      contractId: "ct_1",
      results: [
        { signerId: "s1", email: "ana@revalida.com", name: "Ana Souza", status: "created", coreUserId: "usr_1" },
        { signerId: "s2", email: "joao@revalida.com", name: "João Lima", status: "already_exists", coreUserId: "usr_2" },
      ],
      summary: { created: 1, alreadyExists: 1, failed: 0 },
    });
    renderActions(signedContract());
    fireEvent.click(screen.getByRole("button", { name: "Criar acesso dos alunos" }));
    fireEvent.click(await screen.findByRole("button", { name: "Criar acesso" }));
    await waitFor(() => expect(createPortalStudents).toHaveBeenCalledWith("ct_1"));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Acesso criado para 2 aluno(s)."));
  });

  it("shows failures in Portuguese and never the raw error text", async () => {
    vi.mocked(createPortalStudents).mockResolvedValue({
      contractId: "ct_1",
      results: [{ signerId: "s3", email: "fail@revalida.com", status: "failed", error: "core timeout" }],
      summary: { created: 0, alreadyExists: 0, failed: 1 },
    });
    const { container } = renderActions(signedContract());
    fireEvent.click(screen.getByRole("button", { name: "Criar acesso dos alunos" }));
    fireEvent.click(await screen.findByRole("button", { name: "Criar acesso" }));
    expect(await screen.findByText("Não foi possível criar o acesso de fail@revalida.com.")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/core timeout/);
  });
});
