import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleContract } from "@/services/contractsApi";
import SignedContractActions from "./SignedContractActions";

vi.mock("@/services/contractsApi", async () => {
  const actual = await vi.importActual<typeof import("@/services/contractsApi")>(
    "@/services/contractsApi",
  );
  return {
    ...actual,
    downloadSignedContractPdf: vi.fn(),
    createPortalStudents: vi.fn(),
  };
});

const { downloadSignedContractPdf, createPortalStudents } = await import("@/services/contractsApi");

function signedContract(overrides: Partial<SaleContract> = {}): SaleContract {
  return {
    id: "ct_1",
    saleId: "sale_1",
    productType: "PROGRAMA_REVALIDA_ITALIA",
    templateId: "tpl",
    status: "SIGNED",
    generatedAt: "2026-09-17T12:00:00.000Z",
    signedAt: "2026-09-17T15:00:00.000Z",
    signers: [
      { id: "s1", name: "Ana Souza", email: "ana@revalida.com", recipientId: 1 },
      { id: "s2", name: "João Lima", email: "joao@revalida.com", recipientId: 2 },
    ],
    ...overrides,
  };
}

function renderActions(contract: SaleContract) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SignedContractActions contract={contract} />
    </QueryClientProvider>,
  );
}

describe("SignedContractActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("renders nothing when the contract is not signed", () => {
    const { container } = renderActions(signedContract({ status: "GENERATED", signedAt: null }));
    expect(container).toBeEmptyDOMElement();
  });

  it("shows signed-only actions", () => {
    renderActions(signedContract());
    expect(screen.getByRole("button", { name: "Baixar contrato" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar alunos no portal" })).toBeInTheDocument();
    expect(screen.getByText(/PRIMEIRONOME@/)).toBeInTheDocument();
  });

  it("downloads the signed PDF", async () => {
    vi.mocked(downloadSignedContractPdf).mockResolvedValue();
    renderActions(signedContract());
    fireEvent.click(screen.getByRole("button", { name: "Baixar contrato" }));
    await waitFor(() => {
      expect(downloadSignedContractPdf).toHaveBeenCalledWith("ct_1");
    });
  });

  it("shows partial create-student results", async () => {
    vi.mocked(createPortalStudents).mockResolvedValue({
      results: [
        {
          email: "ana@revalida.com",
          name: "Ana Souza",
          status: "created",
          temporaryPassword: "ANA@2026",
        },
        { email: "joao@revalida.com", name: "João Lima", status: "already_exists" },
        { email: "fail@revalida.com", status: "failed", error: "core timeout" },
      ],
    });

    renderActions(signedContract());
    fireEvent.click(screen.getByRole("button", { name: "Criar alunos no portal" }));

    expect(await screen.findByText("Resultado da criação de alunos")).toBeInTheDocument();
    expect(screen.getByText("1 criado(s) · 1 já existia(m) · 1 falha(s)")).toBeInTheDocument();
    expect(screen.getByText("Criado")).toBeInTheDocument();
    expect(screen.getByText("Já existia")).toBeInTheDocument();
    expect(screen.getByText("Falhou")).toBeInTheDocument();
    expect(screen.getByText(/senha ANA@2026/)).toBeInTheDocument();
    expect(screen.getByText("core timeout")).toBeInTheDocument();
    expect(createPortalStudents).toHaveBeenCalledWith("ct_1");
  });

  it("does not create students when confirm is cancelled", () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    renderActions(signedContract());
    fireEvent.click(screen.getByRole("button", { name: "Criar alunos no portal" }));
    expect(createPortalStudents).not.toHaveBeenCalled();
  });
});
