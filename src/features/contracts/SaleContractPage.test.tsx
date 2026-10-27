import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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
      { id: "p1", clientId: "c1", fullName: "Billy Willy", document: "123.456.789-00", profession: "Médico", email: "", phone: "", nationality: "Brasileira", address: null },
    ],
    decreeIncluded: false,
    products: [],
    expenses: { translationsIncluded: false, apostillesIncluded: false, postalExpensesIncluded: false },
    currency: "BRL",
    totalAmount: 10000,
    phases,
    contractStartDate: "2026-10-15",
    contractEndDate: null,
    contractDurationMonths: null,
    referenceCity: "",
    witnesses: [
      { fullName: "", document: "" },
      { fullName: "", document: "" },
    ],
    contractVersion: "1.0",
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
  fireEvent.click(screen.getByRole("checkbox", { name: "Curso Start" }));
  type("contract-product-START-release", "15/10/2026");
  type("contract-product-START-duration", "12");
  type("contract-term-end", "15/04/2028");
  type("contract-reference-city", "São Paulo");
  type("contract-witness-0-fullName", "Ana Rocha");
  type("contract-witness-0-document", "111.222.333-96");
  type("contract-witness-1-fullName", "Carlos Nunes");
  type("contract-witness-1-document", "444.555.666-55");
}

const originalMatchMedia = window.matchMedia;

function setViewport(width: number) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const min = /min-width:\s*(\d+)px/.exec(query);
      const max = /max-width:\s*(\d+)px/.exec(query);
      let matches = false;
      if (min) matches = width >= Number(min[1]);
      if (max) matches = width <= Number(max[1]);
      return {
        matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    },
  });
}

beforeAll(() => {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
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
  it("shows the title, the client and the six sections", async () => {
    await ready();
    expect(screen.getByRole("heading", { name: "Gerar contrato", level: 1 })).toBeInTheDocument();
    expect(await screen.findByText("Billy Willy e mais 1")).toBeInTheDocument();
    for (const title of ["Contratantes", "O que está incluso", "Vigência do contrato", "Pagamento", "Assinaturas", "Observações internas \\(não vão no contrato\\)"]) {
      expect(screen.getByRole("heading", { name: new RegExp(title) })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /Venda/ })).toHaveAttribute("href", "/vendas/s1");
  });

  it("shows each product with the description from the catalog, read only, and Não as the default for extras", async () => {
    await ready();
    expect(screen.getByText("Curso de entrada do programa, com o conteúdo da parte documental do processo de revalidação")).toBeInTheDocument();
    for (const name of ["Tradução juramentada", "Apostila de Haia", "Despesas postais"]) {
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
    expect(screen.getByRole("button", { name: "Escolha pelo menos um produto ou serviço." })).toBeInTheDocument();
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

  it("has the decree as a switch with no dates, and asks for release and duration of a product", async () => {
    await ready();
    fireEvent.click(screen.getByRole("switch", { name: "Decreto" }));
    expect(document.getElementById("contract-decree-release")).toBeNull();
    expect(document.getElementById("contract-decree-duration")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Italiano Médico" }));
    expect(byId("contract-product-ITALIANO_MEDICO-duration").placeholder).toBe("");
    fireEvent.click(generateButton());
    expect(screen.getByRole("button", { name: "Falta: duração de Italiano Médico" })).toBeInTheDocument();
    type("contract-product-ITALIANO_MEDICO-release", "15/10/2027");
    type("contract-product-ITALIANO_MEDICO-duration", "12");
    expect(screen.getByText("até 15/10/2028")).toBeInTheDocument();
  });

  it("offers the professions with Médico picked, and a field for another one", async () => {
    vi.mocked(generateContract).mockResolvedValue({ id: "ct_new" } as never);
    await ready();
    const group = screen.getByRole("radiogroup", { name: "Profissão" });
    expect(within(group).getByRole("radio", { name: "Médico" })).toBeChecked();
    for (const name of ["Enfermeiro(a)", "Fisioterapeuta", "Odontólogo(a)", "Farmacêutico(a)", "Outra"]) {
      expect(within(group).getByRole("radio", { name })).toBeInTheDocument();
    }
    fireEvent.click(within(group).getByRole("radio", { name: "Outra" }));
    type("contract-party-0-profession", "Biomédico");
    fillEverything();
    fireEvent.click(generateButton());
    await waitFor(() => expect(generateContract).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(generateContract).mock.calls[0][1] as { parties: Array<{ profession: string }> };
    expect(payload.parties[0].profession).toBe("Biomédico");
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

  it("shows the Escola contract in the currency of the sale, with several students, course and city", async () => {
    vi.mocked(generateContract).mockResolvedValue({ id: "ct_school" } as never);
    const schoolPhases = [1, 2, 3, 4, 5].map((n) => ({
      number: n,
      name: `Parcela ${n}`,
      amount: 480,
      dueDateOrTrigger: `2026-${String(7 + n).padStart(2, "0")}-20`,
      linkedModuleCodes: [] as string[],
    }));
    const student = {
      id: "c1",
      clientId: "c1",
      fullName: "Billy Willy",
      birthDate: "1990-05-10",
      birthPlace: "São Paulo",
      nationality: "brasiliana",
      passport: null,
      fullAddress: "Rua A, 1",
      email: "billy@example.com",
      phone: "+55 (11) 98888-0000",
    };
    vi.mocked(prefillContract).mockImplementation((async (_saleId: string, productType: string) =>
      productType === "ESCOLA_DE_ITALIANO"
        ? {
            productType: "ESCOLA_DE_ITALIANO",
            students: [student],
            course: { durationMonths: 4, startDate: "" },
            referenceCity: "",
            currency: "EUR",
            totalAmount: 2400,
            phases: schoolPhases,
            contractVersion: "1.0",
            notes: null,
          }
        : makePrefill()) as never);
    await ready();
    fireEvent.keyDown(screen.getByRole("button", { name: /Trocar modelo/ }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Escola de Italiano" }));
    await screen.findByRole("heading", { name: /Estudantes/ });
    const section = document.getElementById("contract-section-payment") as HTMLElement;
    await waitFor(() => expect(within(section).getAllByText(/^€\s*480,00$/)).toHaveLength(5));
    expect(section.textContent).toMatch(/Total\s*€\s*2\.400,00/);
    expect(document.body.textContent).not.toMatch(/R\$/);
    for (const gone of ["Finalidade do curso", "Horas semanais", "Nível inicial e objetivo"]) {
      expect(screen.queryByText(gone)).toBeNull();
    }

    fireEvent.click(screen.getByRole("button", { name: "Adicionar estudante" }));
    expect(screen.getByRole("heading", { name: "Estudante 2" })).toBeInTheDocument();
    type("contract-school-1-fullName", "Ana Lima");
    type("contract-school-1-birthDate", "02/03/1992");
    type("contract-school-1-birthPlace", "Curitiba");
    type("contract-school-1-nationality", "brasiliana");
    type("contract-school-1-fullAddress", "Rua B, 2");
    type("contract-school-1-email", "ana@example.com");
    type("contract-school-1-phone", "41977770000");
    type("contract-school-startDate", "11/01/2027");
    type("contract-reference-city", "Pordenone");
    const resumo = screen.getByRole("complementary", { name: "Resumo" });
    expect(within(resumo).getByText("2 estudantes")).toBeInTheDocument();
    expect(within(resumo).getByText("4 meses a partir de 11/01/2027")).toBeInTheDocument();
    fireEvent.click(generateButton());
    await waitFor(() => expect(generateContract).toHaveBeenCalledTimes(1));
    const [, payload, productType] = vi.mocked(generateContract).mock.calls[0] as [string, Record<string, unknown>, string];
    expect(productType).toBe("ESCOLA_DE_ITALIANO");
    expect(payload).toMatchObject({
      course: { durationMonths: 4, startDate: "2027-01-11" },
      referenceCity: "Pordenone",
    });
    expect((payload.students as Array<{ fullName: string }>).map((s) => s.fullName)).toEqual(["Billy Willy", "Ana Lima"]);
    for (const key of ["currency", "totalAmount", "phases"]) expect(payload).not.toHaveProperty(key);
  });

  it("shows a EUR sale in € with the amounts entered on the sale, with no conversion", async () => {
    vi.mocked(prefillContract).mockResolvedValue(
      makePrefill({
        currency: "EUR",
        totalAmount: 2400,
        phases: [
          { number: 1, name: "Entrada", amount: 600, dueDateOrTrigger: "2026-11-10", linkedModuleCodes: [] },
          ...[1, 2, 3].map((i) => ({
            number: i + 1,
            name: `Parcela ${i}`,
            amount: 600,
            dueDateOrTrigger: `2027-0${i}-10`,
            linkedModuleCodes: [],
          })),
        ],
      }) as never,
    );
    await ready();
    const section = document.getElementById("contract-section-payment") as HTMLElement;
    expect(within(section).getAllByText(/^€\s*600,00$/)).toHaveLength(4);
    expect(section.textContent).toMatch(/Total\s*€\s*2\.400,00/);
    const resumo = screen.getByRole("complementary", { name: "Resumo" });
    expect(resumo.textContent).toMatch(/€\s*2\.400,00/);
    expect(document.body.textContent).not.toMatch(/R\$/);
  });

  it("shows a BRL sale in R$", async () => {
    await ready();
    const section = document.getElementById("contract-section-payment") as HTMLElement;
    expect(within(section).getAllByText(/^R\$\s*5\.000,00$/)).toHaveLength(2);
    expect(section.textContent).toMatch(/Total\s*R\$\s*10\.000,00/);
    expect(document.body.textContent).not.toMatch(/€/);
  });

  it("suggests the end of the term, applies it on request and never overwrites what was typed", async () => {
    await ready();
    fireEvent.click(screen.getByRole("checkbox", { name: "Italiano Médico" }));
    type("contract-product-ITALIANO_MEDICO-release", "15/10/2027");
    type("contract-product-ITALIANO_MEDICO-duration", "6");
    expect(screen.getByText(/Sugerido: 15\/04\/2028/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Usar" }));
    expect(byId("contract-term-end").value).toBe("15/04/2028");
    type("contract-term-end", "15/10/2028");
    expect(byId("contract-term-end").value).toBe("15/10/2028");
    type("contract-product-ITALIANO_MEDICO-duration", "9");
    expect(byId("contract-term-end").value).toBe("15/10/2028");
    expect(screen.getByText(/Sugerido: 15\/07/)).toBeInTheDocument();
  });

  it("updates the Resumo: included, not included and the term", async () => {
    await ready();
    fillEverything();
    const resumo = screen.getByRole("complementary", { name: "Resumo" });
    expect(within(resumo).getByText("Decreto")).toBeInTheDocument();
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
      referenceCity: "São Paulo",
      witnesses: [
        { fullName: "Ana Rocha", document: "111.222.333-96" },
        { fullName: "Carlos Nunes", document: "444.555.666-55" },
      ],
      products: [{ code: "START", included: true, releaseDate: "2026-10-15", durationMonths: 12, endDate: null }],
      contractStartDate: "2026-10-15",
      contractEndDate: "2028-04-15",
      expenses: { translationsIncluded: false, apostillesIncluded: false, postalExpensesIncluded: false },
    });
    // The payment is read only: the API takes it from the sale.
    for (const key of ["currency", "totalAmount", "phases", "liabilityRegime", "decreeReleaseDate", "decreeDurationMonths"]) {
      expect(payload).not.toHaveProperty(key);
    }
    expect(JSON.stringify(payload)).not.toMatch(/HOTMART/i);
    expect((payload.parties as Array<Record<string, unknown>>)[0]).toMatchObject({
      email: "billy@example.com",
      phone: "+55 (11) 98888-0000",
      clientId: "c1",
      profession: "Médico",
    });
    const probe = await screen.findByTestId("sale-page");
    expect(probe).toHaveTextContent("ct_new");
    expect(toast.success).toHaveBeenCalledWith("Contrato gerado.");
  });

  it("shows a server error next to its field, in Portuguese, and keeps the data", async () => {
    vi.mocked(generateContract).mockRejectedValue(
      Object.assign(new Error("Release date of START is required"), {
        errors: [{ code: "V_PERIOD", field: "products.0.releaseDate", message: "Release date of START is required" }],
      }),
    );
    await ready();
    fillEverything();
    fireEvent.click(generateButton());
    expect(await screen.findByText("Escolha a data de liberação.")).toBeInTheDocument();
    expect(byId("contract-product-START-release").value).toBe("15/10/2026");
    expect(byId("contract-product-START-release")).toHaveAttribute("aria-invalid", "true");
    expect(toast.error).not.toHaveBeenCalled();
    // editing clears the server message
    type("contract-product-START-release", "16/10/2026");
    expect(screen.queryByText("Escolha a data de liberação.")).toBeNull();
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

  it("adds a second contractor with its own profession and Remover, and no responsibility choice", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contratante" }));
    expect(screen.getByRole("heading", { name: "Contratante 2" })).toBeInTheDocument();
    expect(screen.getAllByRole("radiogroup", { name: "Profissão" })).toHaveLength(2);
    expect(screen.queryByText(/responde pelo pagamento/i)).toBeNull();
    expect(screen.getAllByRole("button", { name: /Remover/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Remover/ }));
    expect(screen.getAllByRole("radiogroup", { name: "Profissão" })).toHaveLength(1);
  });

  it("shows the saved sale above the form when the window is narrow", async () => {
    await ready();
    const sale = screen.getByRole("region", { name: "Dados da venda" });
    const form = screen.getByRole("heading", { name: /Contratantes/ });
    expect(sale.closest("[data-layout]")).toHaveAttribute("data-layout", "stack");
    expect(screen.getByRole("button", { name: "Dados da venda" }).compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(sale).getByText("Billy Willy")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Resumo" }).closest("[data-layout='rail']")).toBeNull();
    await waitFor(() => expect(getSaleById).toHaveBeenCalledTimes(1));
  });

  it("keeps the summary and the generate action above the sale preview on a wide window", async () => {
    setViewport(1440);
    await ready();
    const sale = screen.getByRole("region", { name: "Dados da venda" });
    const summary = screen.getByRole("complementary", { name: "Resumo" });
    expect(sale.closest("[data-layout]")).toHaveAttribute("data-layout", "rail");
    const column = summary.closest(".sticky");
    expect(column).toHaveClass("sticky");
    expect(column?.className).not.toMatch(/overflow-y-auto/);
    expect(column?.contains(sale)).toBe(true);
    expect(summary.compareDocumentPosition(sale) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(summary).getByRole("button", { name: "Gerar contrato" })).toBeInTheDocument();
    expect(within(sale).getByText("Billy Willy")).toBeInTheDocument();
  });

  it("does not squeeze the document field into the summary column at a laptop width", async () => {
    await ready();
    const layout = screen.getByRole("heading", { name: /Contratantes/ }).closest("[data-layout='stack']");
    const columns = layout?.querySelector(":scope > .grid");
    expect(columns?.className).toContain("xl:grid-cols-[minmax(0,720px)_320px]");
    expect(columns?.className).not.toMatch(/lg:grid-cols/);
    expect(byId("contract-party-0-document").closest(".grid")?.className).toContain("min-w-0");
  });

  it("uses no jargon, no template id and no emoji", async () => {
    await ready();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/REVALIDA_v|SCUOLA_IT|Regime de responsabilidade|Partes|módulo|gatilho|DocuSign|Senha/i);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
