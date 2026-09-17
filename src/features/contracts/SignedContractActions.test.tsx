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
    signedContract: { id: "sc_1" },
    signers: [
      { id: "s1", name: "Ana Souza", email: "ana@revalida.com", recipientId: 1, coreUserId: null },
      { id: "s2", name: "João Lima", email: "joao@revalida.com", recipientId: 2, coreUserId: null },
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

  it("renders nothing when the contract is not signed and has no signedContract", () => {
    const { container } = renderActions(
      signedContract({ status: "GENERATED", signedAt: null, signedContract: null }),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows actions when signedContract is present", () => {
    renderActions(signedContract({ status: "SENT" }));
    expect(screen.getByRole("button", { name: "Baixar contrato" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar alunos no portal" })).toBeInTheDocument();
  });

  it("shows signed-only actions", () => {
    renderActions(signedContract());
    expect(screen.getByRole("button", { name: "Baixar contrato" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar alunos no portal" })).toBeInTheDocument();
    expect(screen.getByText(/Primeironome@/)).toBeInTheDocument();
  });

  it("downloads the signed PDF", async () => {
    vi.mocked(downloadSignedContractPdf).mockResolvedValue();
    renderActions(signedContract());
    fireEvent.click(screen.getByRole("button", { name: "Baixar contrato" }));
    await waitFor(() => {
      expect(downloadSignedContractPdf).toHaveBeenCalledWith("ct_1");
    });
  });

  it("shows partial create-student results without passwords", async () => {
    vi.mocked(createPortalStudents).mockResolvedValue({
      contractId: "ct_1",
      results: [
        {
          signerId: "s1",
          email: "ana@revalida.com",
          name: "Ana Souza",
          status: "created",
          coreUserId: "usr_1",
        },
        {
          signerId: "s2",
          email: "joao@revalida.com",
          name: "João Lima",
          status: "already_exists",
          coreUserId: "usr_2",
        },
        { signerId: "s3", email: "fail@revalida.com", status: "failed", error: "core timeout" },
      ],
      summary: { created: 1, alreadyExists: 1, failed: 1 },
    });

    renderActions(signedContract());
    fireEvent.click(screen.getByRole("button", { name: "Criar alunos no portal" }));

    expect(await screen.findByText("Resultado da criação de alunos")).toBeInTheDocument();
    expect(screen.getByText("1 criado(s) · 1 já existia(m) · 1 falha(s)")).toBeInTheDocument();
    expect(screen.getByText("Criado")).toBeInTheDocument();
    expect(screen.getByText("Já existia")).toBeInTheDocument();
    expect(screen.getByText("Falhou")).toBeInTheDocument();
    expect(screen.getByText("core usr_1")).toBeInTheDocument();
    expect(screen.getByText("core timeout")).toBeInTheDocument();
    expect(screen.queryByText(/senha [A-Z]+@\d{4}/)).not.toBeInTheDocument();
    expect(createPortalStudents).toHaveBeenCalledWith("ct_1");
  });

  it("does not create students when confirm is cancelled", () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    renderActions(signedContract());
    fireEvent.click(screen.getByRole("button", { name: "Criar alunos no portal" }));
    expect(createPortalStudents).not.toHaveBeenCalled();
  });
});
