import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import SaleContractPage from "./SaleContractPage";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/commercialApi", async () => {
  const actual = await vi.importActual<typeof import("@/services/commercialApi")>("@/services/commercialApi");
  return { ...actual, getSaleById: vi.fn() };
});
vi.mock("@/services/contractsApi", async () => {
  const actual = await vi.importActual<typeof import("@/services/contractsApi")>("@/services/contractsApi");
  return { ...actual, prefillContract: vi.fn(), listRevalidaProducts: vi.fn(), generateContract: vi.fn() };
});

const { getSaleById } = await import("@/services/commercialApi");
const { prefillContract, listRevalidaProducts, generateContract } = await import("@/services/contractsApi");
const { toast } = await import("sonner");

const catalog = [
  { code: "START", name: "Curso Start", description: "curso de entrada do programa, com o conteúdo da parte documental do processo de revalidação" },
  { code: "PREPARACAO_PROVAS", name: "Preparação para as provas de revalidação", description: "aulas e materiais de estudo para a preparação para as provas de revalidação" },
  { code: "ITALIANO_MEDICO", name: "Italiano Médico", description: "curso de língua italiana voltado à área médica" },
  { code: "ITALIANO_QUATTROMANI", name: "Italiano Quattromani", description: "curso de língua italiana Quattromani" },
] as const;

const phases = [
  { number: 1, name: "Assinatura 1", amount: 5000, dueDateOrTrigger: "2026-09-20", linkedModuleCodes: [] as string[] },
  { number: 2, name: "Assinatura 2", amount: 5000, dueDateOrTrigger: "2026-08-20", linkedModuleCodes: [] as string[] },
];

function makePrefill(overrides: Record<string, unknown> = {}) {
  return {
    productType: "PROGRAMA_REVALIDA_ITALIA",
    parties: [
      { id: "p1", clientId: "c1", fullName: "Billy Willy", document: "123.456.789-00", email: "", phone: "", nationality: "Brasileira", address: null },
    ],
    financialResponsibles: [],
    liabilityRegime: "INDIVIDUAL",
    modules: [],
    decreeIncluded: false,
    decreeReleaseDate: null,
    decreeDurationMonths: 6,
    products: [],
    expenses: { translationsIncluded: false, apostillesIncluded: false, postalExpensesIncluded: false },
    totalAmount: 10000,
    paymentDescription: "parcela 1: R$ 5.000,00",
    phases,
    contractTerm: "Conforme descrito neste contrato",
    contractStartDate: "2026-10-15",
    contractEndDate: null,
    contractDurationMonths: null,
    officialChannel: "a@b.com",
    disputesChannel: "c@d.com",
    signaturePlatform: "DocuSign",
    contractVersion: "1.0",
    graceDays: 5,
    terminationDays: 30,
    paymentMethod: "HOTMART",
    witnesses: [],
    notes: null,
    ...overrides,
  };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="sale-page">LISTA {JSON.stringify(location.state)}</div>;
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/vendas/s1/contrato"]}>
        <Routes>
          <Route path="/vendas/:id/contrato" element={<SaleContractPage />} />
          <Route path="/vendas/:id" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const byId = (id: string) => document.getElementById(id) as HTMLInputElement;
const type = (id: string, value: string) => fireEvent.change(byId(id), { target: { value } });

async function ready() {
  renderPage();
  await screen.findByRole("heading", { name: "Resumo" });
}

function generateButton() {
  return screen.getByRole("button", { name: "Gerar contrato" });
}

/** Everything the form asks for, in the order a seller would do it. */
function fillEverything() {
  type("contract-party-0-email", "billy@example.com");
  type("contract-party-0-phone", "11988880000");
  fireEvent.click(screen.getByRole("switch", { name: "Decreto" }));
  type("contract-decree-release", "15/10/2027");
  fireEvent.click(screen.getByRole("checkbox", { name: "Curso Start" }));
  type("contract-product-START-release", "15/10/2026");
  type("contract-product-START-duration", "12");
  type("contract-term-end", "15/04/2028");
}

beforeAll(() => {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSaleById).mockResolvedValue({
    id: "s1",
    clients: [
      { id: "c1", nameCiphertext: "Billy Willy" },
      { id: "c2", nameCiphertext: "Ana Lima" },
    ],
  } as never);
  vi.mocked(prefillContract).mockResolvedValue(makePrefill() as never);
  vi.mocked(listRevalidaProducts).mockResolvedValue(catalog as never);
});

describe("Gerar contrato page", () => {
  it("shows the title, the client and the five sections", async () => {
    await ready();
    expect(screen.getByRole("heading", { name: "Gerar contrato", level: 1 })).toBeInTheDocument();
    expect(await screen.findByText("Billy Willy e mais 1")).toBeInTheDocument();
    for (const title of ["Contratantes", "O que está incluso", "Vigência do contrato", "Pagamento", "Observações internas \\(não vão no contrato\\)"]) {
      expect(screen.getByRole("heading", { name: new RegExp(title) })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /Venda/ })).toHaveAttribute("href", "/vendas/s1");
  });

  it("shows each product with the description from the catalog, read only, and Não as the default for extras", async () => {
    await ready();
    expect(screen.getByText("Curso de entrada do programa, com o conteúdo da parte documental do processo de revalidação")).toBeInTheDocument();
    for (const name of ["Tradução juramentada", "Apostilamento de Haia", "Envio postal"]) {
      const group = screen.getByRole("radiogroup", { name });
      expect(within(group).getByRole("radio", { name: "Não" })).toBeChecked();
    }
    // nothing is pre-ticked
    for (const c of catalog) expect(screen.getByRole("checkbox", { name: c.name })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "Decreto" })).not.toBeChecked();
  });

  it("disables Gerar contrato and lists the reasons, clickable", async () => {
    await ready();
    expect(generateButton()).toHaveAttribute("aria-disabled", "true");
    const reason = screen.getByRole("button", { name: "Falta: e-mail de Billy Willy" });
    fireEvent.click(reason);
    expect(document.activeElement).toBe(byId("contract-party-0-email"));
    expect(screen.getByRole("button", { name: "Escolha o que está incluso." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Falta: fim da vigência" })).toBeInTheDocument();
    // not shown as an error before the user touches anything
    expect(byId("contract-party-0-email")).not.toHaveAttribute("aria-invalid");
  });

  it("clicking the blocked button shows the errors inline and focuses the first one, with no toast", async () => {
    await ready();
    fireEvent.click(generateButton());
    expect(generateContract).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(byId("contract-party-0-email")).toHaveAttribute("aria-invalid", "true");
    expect(document.activeElement).toBe(byId("contract-party-0-email"));
    expect(screen.getAllByText("Obrigatório").length).toBeGreaterThan(0);
  });

  it("shows the installments read only, in date order, without moving the day", async () => {
    await ready();
    const section = document.getElementById("contract-section-payment") as HTMLElement;
    const rows = within(section).getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Parcela 1");
    expect(rows[0]).toHaveTextContent("20/08/2026");
    expect(rows[1]).toHaveTextContent("Parcela 2");
    expect(rows[1]).toHaveTextContent("20/09/2026");
    expect(section.textContent).not.toMatch(/Assinatura/);
    expect(within(section).getByText("Total")).toBeInTheDocument();
    expect(within(section).queryByRole("textbox")).toBeNull();
    expect(screen.queryByLabelText(/valor total/i)).toBeNull();
    expect(screen.queryByLabelText(/descrição do pagamento/i)).toBeNull();
  });

  it("asks to register the payment when the sale has none", async () => {
    vi.mocked(prefillContract).mockResolvedValue(makePrefill({ phases: [], totalAmount: 0 }) as never);
    await ready();
    expect(screen.getByRole("link", { name: "Ir para a venda" })).toHaveAttribute("href", "/vendas/s1");
    expect(screen.getAllByText("Cadastre o pagamento da venda para gerar o contrato.").length).toBeGreaterThan(0);
    expect(generateButton()).toHaveAttribute("aria-disabled", "true");
  });

  it("opens the decree with release and a duration of 6, and a product with an optional duration", async () => {
    await ready();
    fireEvent.click(screen.getByRole("switch", { name: "Decreto" }));
    expect(byId("contract-decree-duration").value).toBe("6");
    expect(byId("contract-decree-release")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Italiano Médico" }));
    expect(byId("contract-product-ITALIANO_MEDICO-duration").placeholder).toBe("Opcional");
    type("contract-product-ITALIANO_MEDICO-release", "15/10/2027");
    type("contract-product-ITALIANO_MEDICO-duration", "12");
    expect(screen.getByText("até 15/10/2028")).toBeInTheDocument();
  });

  it("lets the decree go without a release date and says what happens", async () => {
    await ready();
    fireEvent.click(screen.getByRole("switch", { name: "Decreto" }));
    expect(screen.getByText("Opcional. Sem data, o início fica a combinar.")).toBeInTheDocument();
    const resumo = screen.getByRole("complementary", { name: "Resumo" });
    expect(within(resumo).getByText("Decreto · 6 meses · início a combinar")).toBeInTheDocument();
    expect(within(resumo).queryByText(/liberação do decreto/)).toBeNull();
  });

  it("shows the start of the term filled with the sale date, next to the end, and sends both", async () => {
    vi.mocked(generateContract).mockResolvedValue({ id: "ct_new" } as never);
    await ready();
    expect(byId("contract-term-start").value).toBe("15/10/2026");
    expect(byId("contract-term-end").value).toBe("");
    fillEverything();
    type("contract-term-start", "01/11/2026");
    fireEvent.click(generateButton());
    await waitFor(() => expect(generateContract).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(generateContract).mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toMatchObject({ contractStartDate: "2026-11-01", contractEndDate: "2028-04-15" });
  });

  it("starts with the decree off and no product ticked", async () => {
    await ready();
    expect(screen.getByRole("switch", { name: "Decreto" })).toHaveAttribute("aria-checked", "false");
    for (const name of ["Curso Start", "Preparação para as provas de revalidação", "Italiano Médico", "Italiano Quattromani"]) {
      expect(screen.getByRole("checkbox", { name })).toHaveAttribute("aria-checked", "false");
    }
  });

  it("shows a card installment line as its parcels and counts them in the total", async () => {
    vi.mocked(prefillContract).mockResolvedValue(
      makePrefill({
        phases: [{ number: 1, name: "Parcela 1", amount: 1000, installments: 12, dueDateOrTrigger: "2026-11-05", linkedModuleCodes: [] }],
        totalAmount: 999,
      }) as never,
    );
    await ready();
    const section = document.getElementById("contract-section-payment") as HTMLElement;
    expect(within(section).getByText("12 parcelas")).toBeInTheDocument();
    expect(within(section).getByText(/1\.000,00 cada/)).toBeInTheDocument();
    expect(within(section).getByText("a partir de 05/11/2026")).toBeInTheDocument();
    expect(within(section).getByText(/12\.000,00/)).toBeInTheDocument();
    const resumo = screen.getByRole("complementary", { name: "Resumo" });
    expect(within(resumo).getByText(/12\.000,00/)).toBeInTheDocument();
  });

  it("shows the Escola contract in reais, with the five installments and the total, and no euro sign", async () => {
    const schoolPhases = [1, 2, 3, 4, 5].map((n) => ({
      number: n,
      name: `Parcela ${n}`,
      amount: 5000,
      dueDateOrTrigger: `2026-${String(7 + n).padStart(2, "0")}-20`,
      linkedModuleCodes: [] as string[],
    }));
    vi.mocked(prefillContract).mockImplementation((async (_saleId: string, productType: string) =>
      productType === "ESCOLA_DE_ITALIANO"
        ? {
            productType: "ESCOLA_DE_ITALIANO",
            student: { fullName: "Billy Willy", birthDate: "", birthPlace: "", nationality: "Brasileira", passport: null, fullAddress: "", email: "", phone: "" },
            course: { purpose: "LANGUAGE", durationMonths: 4, startDate: "", endDate: "", weeklyHours: 20, initialLevel: "A1", targetLevel: "A2" },
            distanceContract: true,
            totalAmount: 25000,
            phases: schoolPhases,
            officialChannel: "a@b.com",
            cancellationChannel: "c@d.com",
            signaturePlatform: "DocuSign",
            contractVersion: "1.0",
          }
        : makePrefill()) as never);
    await ready();
    fireEvent.keyDown(screen.getByRole("button", { name: /Trocar modelo/ }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Escola de Italiano" }));
    await screen.findByLabelText("Nome completo");
    const section = document.getElementById("contract-section-payment") as HTMLElement;
    await waitFor(() => expect(within(section).getAllByText(/^R\$\s*5\.000,00$/)).toHaveLength(5));
    expect(section.textContent).toMatch(/Total\s*R\$\s*25\.000,00/);
    expect(document.body.textContent).not.toMatch(/€|EUR/);
    expect(document.body.textContent).toMatch(/R\$\s*25\.000,00/);
  });

  it("suggests the end of the term, applies it on request and never overwrites what was typed", async () => {
    await ready();
    fireEvent.click(screen.getByRole("switch", { name: "Decreto" }));
    type("contract-decree-release", "15/10/2027");
    expect(screen.getByText(/Sugerido: 15\/04\/2028/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Usar" }));
    expect(byId("contract-term-end").value).toBe("15/04/2028");
    type("contract-term-end", "15/10/2028");
    expect(byId("contract-term-end").value).toBe("15/10/2028");
    type("contract-decree-duration", "9");
    expect(byId("contract-term-end").value).toBe("15/10/2028");
    expect(screen.getByText(/Sugerido: 15\/07/)).toBeInTheDocument();
  });

  it("updates the Resumo: included, not included and the term", async () => {
    await ready();
    fillEverything();
    const resumo = screen.getByRole("complementary", { name: "Resumo" });
    expect(within(resumo).getByText("Decreto · 6 meses")).toBeInTheDocument();
    expect(within(resumo).getByText("Curso Start · 15/10/2026")).toBeInTheDocument();
    expect(within(resumo).getByText("Tradução juramentada")).toBeInTheDocument();
    expect(within(resumo).getByText("Vigência de 15/10/2026 até 15/04/2028")).toBeInTheDocument();
    expect(within(resumo).getByText("R$ 10.000,00")).toBeInTheDocument();
  });

  it("generates with the payload in the new shape and goes back to the sale", async () => {
    vi.mocked(generateContract).mockResolvedValue({ id: "ct_new" } as never);
    await ready();
    fillEverything();
    expect(generateButton()).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(generateButton());
    await waitFor(() => expect(generateContract).toHaveBeenCalledTimes(1));
    const [saleId, payload, productType] = vi.mocked(generateContract).mock.calls[0] as [string, Record<string, unknown>, string];
    expect(saleId).toBe("s1");
    expect(productType).toBe("PROGRAMA_REVALIDA_ITALIA");
    expect(payload).toMatchObject({
      decreeIncluded: true,
      decreeReleaseDate: "2027-10-15",
      decreeDurationMonths: 6,
      products: [{ code: "START", included: true, releaseDate: "2026-10-15", durationMonths: 12, endDate: null }],
      contractStartDate: "2026-10-15",
      contractEndDate: "2028-04-15",
      expenses: { translationsIncluded: false, apostillesIncluded: false, postalExpensesIncluded: false },
    });
    // The payment is read only: the API takes it from the sale.
    for (const key of ["totalAmount", "paymentDescription", "phases", "paymentMethod"]) {
      expect(payload).not.toHaveProperty(key);
    }
    expect(JSON.stringify(payload)).not.toMatch(/HOTMART/i);
    expect((payload.parties as Array<Record<string, unknown>>)[0]).toMatchObject({
      email: "billy@example.com",
      phone: "+55 (11) 98888-0000",
      clientId: "c1",
    });
    const probe = await screen.findByTestId("sale-page");
    expect(probe).toHaveTextContent("ct_new");
    expect(toast.success).toHaveBeenCalledWith("Contrato gerado.");
  });

  it("shows a server error next to its field, in Portuguese, and keeps the data", async () => {
    vi.mocked(generateContract).mockRejectedValue(
      Object.assign(new Error("START: a liberação deve ser antes do fim da vigência do contrato"), {
        errors: [
          { code: "V_PERIOD", field: "products.0.releaseDate", message: "START: a liberação deve ser antes do fim da vigência do contrato" },
        ],
      }),
    );
    await ready();
    fillEverything();
    fireEvent.click(generateButton());
    expect(await screen.findByText("Escolha uma data de liberação antes do fim da vigência.")).toBeInTheDocument();
    expect(byId("contract-product-START-release").value).toBe("15/10/2026");
    expect(byId("contract-product-START-release")).toHaveAttribute("aria-invalid", "true");
    expect(toast.error).not.toHaveBeenCalled();
    // editing clears the server message
    type("contract-product-START-release", "16/10/2026");
    expect(screen.queryByText("Escolha uma data de liberação antes do fim da vigência.")).toBeNull();
  });

  it("never shows raw English when the server fails in an unknown way", async () => {
    vi.mocked(generateContract).mockRejectedValue(new Error("Sum of phases (1) differs from totalAmount (2)"));
    await ready();
    fillEverything();
    fireEvent.click(generateButton());
    expect(await screen.findByText("Não foi possível gerar o contrato. Tente novamente.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Sum of phases|totalAmount/);
    expect(generateButton()).toHaveAttribute("aria-disabled", "false");
  });

  it("blocks the whole form while generating", async () => {
    let finish: (value: unknown) => void = () => {};
    vi.mocked(generateContract).mockReturnValue(new Promise((resolve) => { finish = resolve; }) as never);
    await ready();
    fillEverything();
    fireEvent.click(generateButton());
    expect(await screen.findByRole("button", { name: "Gerando…" })).toBeInTheDocument();
    expect(byId("contract-party-0-email")).toBeDisabled();
    finish({ id: "ct_new" });
    await screen.findByTestId("sale-page");
  });

  it("shows the second contractor with Remover and the responsibility choice", async () => {
    await ready();
    expect(screen.queryByRole("radiogroup", { name: "Quem responde pelo pagamento" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contratante" }));
    expect(screen.getByRole("radiogroup", { name: "Quem responde pelo pagamento" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Cada um responde pela sua parte" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Todos respondem pelo total" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Remover/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Remover/ }));
    expect(screen.queryByRole("radiogroup", { name: "Quem responde pelo pagamento" })).toBeNull();
  });

  it("uses no jargon, no template id and no emoji", async () => {
    await ready();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/REVALIDA_v|SCUOLA_IT|Regime de responsabilidade|Partes|módulo|gatilho|DocuSign|Senha/i);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
