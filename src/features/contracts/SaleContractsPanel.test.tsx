import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setProfile } from "@/lib/session";
import type { SaleContract } from "@/services/contractsApi";
import type { SaleOwnerRef } from "@/features/contracts/access";

const who = vi.hoisted(() => {
  vi.stubEnv("VITE_DOCUSIGN_BUTTON_FLAG", "true");
  return { admin: true };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/contracts/access", async () => {
  const actual = await vi.importActual<typeof import("@/features/contracts/access")>("@/features/contracts/access");
  return {
    ...actual,
    canCreateStudentAccess: () => who.admin,
    canManageSignature: () => who.admin,
  };
});
vi.mock("@/services/contractsApi", async () => {
  const actual = await vi.importActual<typeof import("@/services/contractsApi")>("@/services/contractsApi");
  return {
    ...actual,
    listSaleContracts: vi.fn(),
    sendContractForSignature: vi.fn(),
    refreshContractSignatureStatus: vi.fn(),
    downloadContractPdf: vi.fn(),
    downloadSignedContractPdf: vi.fn(),
  };
});

const { listSaleContracts, sendContractForSignature, downloadContractPdf, downloadSignedContractPdf } = await import(
  "@/services/contractsApi"
);
const { default: SaleContractsPanel } = await import("./SaleContractsPanel");

function contract(id: string, overrides: Partial<SaleContract> = {}): SaleContract {
  return {
    id,
    saleId: "s1",
    productType: "PROGRAMA_REVALIDA_ITALIA",
    templateId: "REVALIDA_v1.0",
    fileName: "REVALIDA_v1.0.pdf",
    status: "GENERATED",
    generatedAt: "2026-10-15T15:00:00.000Z",
    signerEmail: "billy@example.com",
    signers: [
      { id: "a", name: "Billy Willy", email: "billy@example.com", recipientId: 1 },
      { id: "b", name: "Ana Lima", email: "ana@example.com", recipientId: 2 },
    ],
    ...overrides,
  };
}

function renderPanel(sale: SaleOwnerRef = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter>
          <SaleContractsPanel saleId="s1" sellerId={sale.sellerId} seller={sale.seller} />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

function signIn(role: "ADMIN" | "SELLER", sub: string) {
  setProfile({ sub, id: sub, externalId: sub, email: `${sub}@example.com`, name: sub, role, roles: [role] } as never);
}

beforeAll(() => {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  who.admin = true;
  window.localStorage.clear();
  signIn("ADMIN", "admin-1");
});

describe("Contratos list", () => {
  it("shows the empty state with the button to generate", async () => {
    vi.mocked(listSaleContracts).mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText("Nenhum contrato gerado ainda.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gerar contrato" })).toHaveAttribute("href", "/vendas/s1/contrato");
  });

  it("shows a message and a retry when loading fails", async () => {
    vi.mocked(listSaleContracts).mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce([]);
    renderPanel();
    expect(await screen.findByText("Não foi possível carregar os contratos.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Nenhum contrato gerado ainda.")).toBeInTheDocument();
  });

  it("lists the newest first with a human model name, contractors, date and e-mail, never the file name", async () => {
    vi.mocked(listSaleContracts).mockResolvedValue([
      contract("old", { generatedAt: "2026-09-01T12:00:00.000Z" }),
      contract("new", { generatedAt: "2026-10-15T15:00:00.000Z", productType: "ESCOLA_DE_ITALIANO" }),
    ]);
    renderPanel();
    const items = await screen.findAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Escola de Italiano");
    expect(items[1]).toHaveTextContent("Programa Revalida Itália");
    expect(items[0]).toHaveTextContent("Billy Willy e mais 1");
    expect(items[0]).toHaveTextContent("Gerado em 15/10/2026");
    expect(items[0]).toHaveTextContent("billy@example.com");
    expect(document.body.textContent).not.toMatch(/REVALIDA_v1\.0|\.pdf|DocuSign/);
  });

  it("shows the internal notes in the list with a label that says they are not in the contract", async () => {
    vi.mocked(listSaleContracts).mockResolvedValue([
      contract("c1", { internalNotes: "Cliente pediu ligar antes de enviar" }),
      contract("c2", { internalNotes: null }),
    ]);
    renderPanel();
    const items = await screen.findAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Observações internas (não vão no contrato): Cliente pediu ligar antes de enviar");
    expect(items[1]).not.toHaveTextContent("Observações internas");
  });

  it("shows five and expands with Ver todos (N)", async () => {
    vi.mocked(listSaleContracts).mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => contract(`c${i}`, { generatedAt: `2026-10-0${i + 1}T12:00:00.000Z` })),
    );
    renderPanel();
    expect(await screen.findAllByRole("listitem")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Ver todos (7)" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
  });

  it("Gerado: Enviar para assinatura is the primary action and asks before sending", async () => {
    vi.mocked(listSaleContracts).mockResolvedValue([contract("c1")]);
    vi.mocked(sendContractForSignature).mockResolvedValue(contract("c1", { status: "SENT" }));
    renderPanel();
    const item = (await screen.findAllByRole("listitem"))[0];
    expect(within(item).getByText("Gerado")).toBeInTheDocument();
    expect(within(item).getByRole("button", { name: "Baixar PDF" })).toBeInTheDocument();
    fireEvent.click(within(item).getByRole("button", { name: "Enviar para assinatura" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("billy@example.com, ana@example.com");
    expect(sendContractForSignature).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(sendContractForSignature).toHaveBeenCalledWith("c1"));
  });

  it("Enviado with envelope: Atualizar status plus download", async () => {
    vi.mocked(listSaleContracts).mockResolvedValue([contract("c1", { status: "SENT", docusignEnvelopeId: "env" })]);
    renderPanel();
    const item = (await screen.findAllByRole("listitem"))[0];
    expect(within(item).getByText("Enviado")).toBeInTheDocument();
    expect(within(item).getByRole("button", { name: "Atualizar status" })).toBeInTheDocument();
    expect(within(item).getByRole("button", { name: "Baixar PDF" })).toBeInTheDocument();
    expect(within(item).queryByRole("button", { name: "Enviar para assinatura" })).toBeNull();
  });

  it("Assinado: Baixar contrato primary, plus Criar acesso dos alunos, and no password text", async () => {
    vi.mocked(listSaleContracts).mockResolvedValue([contract("c1", { status: "SIGNED", signedContract: { id: "sc" } })]);
    vi.mocked(downloadSignedContractPdf).mockResolvedValue();
    renderPanel();
    const item = (await screen.findAllByRole("listitem"))[0];
    expect(within(item).getByText("Assinado")).toBeInTheDocument();
    fireEvent.click(within(item).getByRole("button", { name: "Baixar contrato" }));
    await waitFor(() => expect(downloadSignedContractPdf).toHaveBeenCalledWith("c1"));
    expect(within(item).getByRole("button", { name: "Criar acesso dos alunos" })).toBeInTheDocument();
    expect(item.textContent).not.toMatch(/senha|Primeironome|core|@\d{4}/i);
  });

  it.each([
    ["DECLINED", "Recusado"],
    ["VOIDED", "Cancelado"],
  ] as const)("%s: download and Gerar novo contrato", async (status, label) => {
    vi.mocked(listSaleContracts).mockResolvedValue([contract("c1", { status })]);
    vi.mocked(downloadContractPdf).mockResolvedValue();
    renderPanel();
    const item = (await screen.findAllByRole("listitem"))[0];
    expect(within(item).getByText(label)).toBeInTheDocument();
    expect(within(item).getByRole("link", { name: "Gerar novo contrato" })).toHaveAttribute("href", "/vendas/s1/contrato");
    expect(within(item).getByRole("button", { name: "Baixar PDF" })).toBeInTheDocument();
  });

  it("uses an icon per status and no emoji", async () => {
    vi.mocked(listSaleContracts).mockResolvedValue(
      (["GENERATED", "SENT", "SIGNED", "DECLINED", "VOIDED"] as const).map((status, i) =>
        contract(`c${i}`, { status, generatedAt: `2026-10-0${i + 1}T12:00:00.000Z` }),
      ),
    );
    const { container } = renderPanel();
    await screen.findAllByRole("listitem");
    expect(container.querySelectorAll("li svg.lucide").length).toBeGreaterThanOrEqual(5);
    expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe("Contratos list for a seller", () => {
  it("owner sees Enviar para assinatura and can send; no status refresh and no student access", async () => {
    who.admin = false;
    signIn("SELLER", "seller-1");
    vi.mocked(listSaleContracts).mockResolvedValue([
      contract("c1", { status: "GENERATED" }),
      contract("c2", { status: "SENT", docusignEnvelopeId: "env-1" }),
    ]);
    vi.mocked(sendContractForSignature).mockResolvedValue(contract("c1", { status: "SENT" }));
    renderPanel({ sellerId: "internal-1", seller: { id: "internal-1", externalId: "seller-1" } });
    const items = await screen.findAllByRole("listitem");
    fireEvent.click(within(items[0]).getByRole("button", { name: "Enviar para assinatura" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(sendContractForSignature).toHaveBeenCalledWith("c1"));
    expect(screen.queryByRole("button", { name: "Atualizar status" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Criar acesso dos alunos" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Baixar PDF" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Gerar contrato" })).toBeInTheDocument();
  });

  it("a seller who does not own the sale does not see Enviar para assinatura", async () => {
    who.admin = false;
    signIn("SELLER", "seller-2");
    vi.mocked(listSaleContracts).mockResolvedValue([
      contract("c1", { status: "GENERATED" }),
      contract("c2", { status: "SENT", docusignEnvelopeId: "env-1" }),
    ]);
    renderPanel({ sellerId: "seller-1" });
    await screen.findAllByText("Programa Revalida Itália");
    expect(screen.queryByRole("button", { name: "Enviar para assinatura" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Atualizar status" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Baixar PDF" })).toHaveLength(2);
  });
});
