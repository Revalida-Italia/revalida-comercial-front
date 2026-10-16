import { describe, expect, it } from "vitest";
import type { RevalidaContractPayload, RevalidaProduct } from "@/services/contractsApi";
import {
  buildRevalidaPayload,
  buildRevalidaSummary,
  buildSchoolPayload,
  createInitialRevalidaState,
  formatPhone,
  paymentTotal,
  suggestTermEnd,
  validateRevalidaForm,
  type RevalidaFormState,
} from "./contractFormModel";

const catalog: RevalidaProduct[] = [
  { code: "START", name: "Curso Start", description: "curso de entrada" },
  { code: "PREPARACAO_PROVAS", name: "Preparação para as provas de revalidação", description: "aulas" },
  { code: "ITALIANO_MEDICO", name: "Italiano Médico", description: "italiano médico" },
  { code: "ITALIANO_QUATTROMANI", name: "Italiano Quattromani", description: "quattromani" },
];

const phases = [
  { number: 1, name: "Parcela 1", amount: 12500, dueDateOrTrigger: "2026-10-15", linkedModuleCodes: [] },
  { number: 2, name: "Parcela 2", amount: 12500, dueDateOrTrigger: "2027-04-15", linkedModuleCodes: [] },
];

function prefill(overrides: Partial<RevalidaContractPayload> = {}): RevalidaContractPayload {
  return {
    productType: "PROGRAMA_REVALIDA_ITALIA",
    parties: [
      {
        id: "p1",
        fullName: "Billy Willy",
        document: "123.456.789-00",
        email: "billy@example.com",
        phone: "+55 (11) 98888-0000",
        nationality: "Brasileira",
      },
    ],
    liabilityRegime: "INDIVIDUAL",
    decreeIncluded: false,
    decreeReleaseDate: null,
    decreeDurationMonths: 6,
    products: [],
    expenses: { translationsIncluded: false, apostillesIncluded: false, postalExpensesIncluded: false },
    totalAmount: 25000,
    paymentDescription: "parcela 1",
    phases,
    contractTerm: "Conforme descrito neste contrato",
    contractStartDate: "2026-10-15",
    contractEndDate: null,
    contractDurationMonths: null,
    officialChannel: "x",
    disputesChannel: "y",
    signaturePlatform: "DocuSign",
    contractVersion: "1.0",
    notes: null,
    ...overrides,
  };
}

const pay = { phases };

/** Breno's example: sale on 15/10/2026, term until 15/10/2028. */
function brenoState(): RevalidaFormState {
  const s = createInitialRevalidaState(prefill());
  s.decreeOn = true;
  s.decreeRelease = "2027-10-15";
  s.products.START = { selected: true, releaseDate: "2026-10-15", durationMonths: "12" };
  s.products.ITALIANO_QUATTROMANI = { selected: true, releaseDate: "2026-10-15", durationMonths: "24" };
  s.products.PREPARACAO_PROVAS = { selected: true, releaseDate: "2027-10-15", durationMonths: "12" };
  s.products.ITALIANO_MEDICO = { selected: true, releaseDate: "2027-10-15", durationMonths: "" };
  s.termEnd = "2028-10-15";
  return s;
}

describe("initial state", () => {
  it("starts with nothing ticked, extras on Não, decree duration 6, the sale date as start and no end date", () => {
    const s = createInitialRevalidaState(prefill());
    expect(s.decreeOn).toBe(false);
    expect(s.decreeMonths).toBe("6");
    expect(Object.values(s.products).every((p) => !p.selected)).toBe(true);
    expect(Object.values(s.extras).every((v) => v === false)).toBe(true);
    expect(s.termStart).toBe("2026-10-15");
    expect(s.termEnd).toBe("");
  });
});

describe("validateRevalidaForm", () => {
  it("accepts Breno's example", () => {
    expect(validateRevalidaForm(brenoState(), catalog, pay)).toEqual([]);
  });

  it("asks for what is included, the end of the term and the payment", () => {
    const s = createInitialRevalidaState(prefill());
    const issues = validateRevalidaForm(s, catalog, { phases: [] });
    expect(issues.map((i) => i.message)).toEqual([
      "Escolha o que está incluso.",
      "Escolha a data de fim da vigência.",
      "Cadastre o pagamento da venda para gerar o contrato.",
    ]);
  });

  it("lists what is missing per contractor, in Portuguese, naming the person", () => {
    const s = createInitialRevalidaState(prefill({ parties: [{ id: "p1", fullName: "Billy Willy", document: "1", email: "", phone: "" }] }));
    s.decreeOn = true;
    const summaries = validateRevalidaForm(s, catalog, pay).map((i) => i.summary);
    expect(summaries).toContain("Falta: e-mail de Billy Willy");
    expect(summaries).toContain("Falta: telefone de Billy Willy");
    expect(summaries).not.toContain("Falta: liberação do decreto");
  });

  it("accepts the decree without a release date: the contract leaves the start 'a combinar'", () => {
    const s = brenoState();
    s.decreeRelease = "";
    expect(validateRevalidaForm(s, catalog, pay)).toEqual([]);
    const { payload } = buildRevalidaPayload(prefill(), s);
    expect(payload.decreeIncluded).toBe(true);
    expect(payload.decreeReleaseDate).toBeNull();
    expect(buildRevalidaSummary(s, catalog).included[0]).toBe("Decreto · 6 meses · início a combinar");
  });

  it("checks the start of the term against the end", () => {
    const s = brenoState();
    s.termStart = "2028-10-15";
    expect(validateRevalidaForm(s, catalog, pay).map((i) => i.message)).toEqual([
      "Escolha uma data depois de 15/10/2028.",
    ]);
    s.termStart = "";
    expect(validateRevalidaForm(s, catalog, pay)).toEqual([]);
  });

  it("requires a release date for each ticked product and accepts an empty duration", () => {
    const s = createInitialRevalidaState(prefill());
    s.products.START = { selected: true, releaseDate: "", durationMonths: "" };
    s.termEnd = "2028-10-15";
    const issues = validateRevalidaForm(s, catalog, pay);
    expect(issues.map((i) => i.fieldId)).toEqual(["contract-product-START-release"]);
    expect(issues[0].message).toBe("Escolha a data de liberação.");
  });

  it("rejects an invalid duration", () => {
    const s = brenoState();
    s.products.START.durationMonths = "0";
    s.decreeMonths = "61";
    const messages = validateRevalidaForm(s, catalog, pay).map((i) => i.message);
    expect(messages.filter((m) => m === "Digite de 1 a 60 meses.")).toHaveLength(2);
  });

  it("does not accept an end of term before the last release or before a period ends", () => {
    const s = brenoState();
    s.termEnd = "2027-10-15";
    expect(validateRevalidaForm(s, catalog, pay).map((i) => i.message)).toEqual([
      "Escolha uma data depois da liberação.",
    ]);
    s.products.ITALIANO_MEDICO.releaseDate = "2026-10-15";
    s.products.PREPARACAO_PROVAS.releaseDate = "2026-10-15";
    s.decreeRelease = "2026-10-15";
    s.termEnd = "2027-10-15";
    const issues = validateRevalidaForm(s, catalog, pay);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("15/10/2028");
  });

  it("takes the total from the installments, counting every parcel of a card installment line", () => {
    expect(paymentTotal(phases)).toBe(25000);
    expect(paymentTotal([{ number: 1, name: "Parcela 1", amount: 1000, installments: 12, dueDateOrTrigger: "2026-11-05", linkedModuleCodes: [] }])).toBe(12000);
    expect(paymentTotal([], 7000)).toBe(7000);
  });

  it("checks e-mail and phone shape", () => {
    const s = brenoState();
    s.parties[0].email = "billy";
    s.parties[0].phone = "123";
    expect(validateRevalidaForm(s, catalog, pay).map((i) => i.message)).toEqual([
      "Digite um e-mail válido.",
      "Digite um telefone válido.",
    ]);
  });
});

describe("suggestTermEnd", () => {
  it("is the latest end among decree and products that have a duration", () => {
    expect(suggestTermEnd(brenoState())).toBe("2028-10-15");
  });

  it("is null when nothing has a duration", () => {
    const s = createInitialRevalidaState(prefill());
    s.products.ITALIANO_MEDICO = { selected: true, releaseDate: "2026-10-15", durationMonths: "" };
    expect(suggestTermEnd(s)).toBeNull();
  });
});

describe("buildRevalidaPayload", () => {
  it("sends only ticked products, the term and no payment fields (the API takes them from the sale)", () => {
    const { payload, sentProductCodes } = buildRevalidaPayload(prefill(), brenoState());
    expect(sentProductCodes).toEqual(["START", "PREPARACAO_PROVAS", "ITALIANO_MEDICO", "ITALIANO_QUATTROMANI"]);
    expect(payload.products?.[2]).toEqual({
      code: "ITALIANO_MEDICO",
      included: true,
      releaseDate: "2027-10-15",
      durationMonths: null,
      endDate: null,
    });
    expect(payload.decreeIncluded).toBe(true);
    expect(payload.decreeReleaseDate).toBe("2027-10-15");
    expect(payload.decreeDurationMonths).toBe(6);
    expect(payload.contractEndDate).toBe("2028-10-15");
    expect(payload.contractStartDate).toBe("2026-10-15");
    expect(payload).not.toHaveProperty("totalAmount");
    expect(payload).not.toHaveProperty("paymentDescription");
    expect(payload).not.toHaveProperty("phases");
    expect(JSON.stringify(payload)).not.toMatch(/HOTMART/i);
    expect(payload.liabilityRegime).toBe("INDIVIDUAL");
  });

  it("leaves unticked items out and keeps the decree off", () => {
    const s = createInitialRevalidaState(prefill());
    s.products.START = { selected: true, releaseDate: "2026-10-15", durationMonths: "" };
    s.extras.translationsIncluded = true;
    s.notes = "  ";
    const { payload } = buildRevalidaPayload(prefill(), s);
    expect(payload.products).toHaveLength(1);
    expect(payload.decreeIncluded).toBe(false);
    expect(payload.decreeReleaseDate).toBeNull();
    expect(payload.expenses).toEqual({ translationsIncluded: true, apostillesIncluded: false, postalExpensesIncluded: false });
    expect(payload.notes).toBeNull();
  });

  it("forces individual liability with a single contractor and keeps the choice with two", () => {
    const s = brenoState();
    s.liabilityRegime = "JOINT";
    expect(buildRevalidaPayload(prefill(), s).payload.liabilityRegime).toBe("INDIVIDUAL");
    s.parties.push({ key: "x", id: "p2", fullName: "Ana", document: "2", nationality: "", email: "a@a.com", phone: "+55 (11) 91111-2222" });
    expect(buildRevalidaPayload(prefill(), s).payload.liabilityRegime).toBe("JOINT");
  });
});

describe("buildRevalidaSummary", () => {
  it("shows included with dates, not included extras and the term", () => {
    const s = brenoState();
    s.extras.apostillesIncluded = true;
    const summary = buildRevalidaSummary(s, catalog);
    expect(summary.contractors).toBe("1 contratante");
    expect(summary.included).toEqual([
      "Decreto · 6 meses",
      "Curso Start · 15/10/2026",
      "Preparação para as provas de revalidação · 15/10/2027",
      "Italiano Médico · 15/10/2027",
      "Italiano Quattromani · 15/10/2026",
      "Apostilamento de Haia",
    ]);
    expect(summary.notIncluded).toEqual(["Tradução juramentada", "Envio postal"]);
    expect(summary.term).toBe("15/10/2028");
    expect(summary.termStart).toBe("15/10/2026");
  });
});

describe("buildSchoolPayload", () => {
  it("leaves the payment fields out", () => {
    const payload = buildSchoolPayload({
      productType: "ESCOLA_DE_ITALIANO",
      student: { fullName: "G", birthDate: "", birthPlace: "", nationality: "", fullAddress: "", email: "", phone: "" },
      course: { purpose: "LANGUAGE", durationMonths: 4, startDate: "", endDate: "", weeklyHours: 20, initialLevel: "A1", targetLevel: "A2" },
      distanceContract: true,
      totalAmount: 5,
      paymentDescription: "via HOTMART",
      phases,
      officialChannel: "x",
      cancellationChannel: "y",
      signaturePlatform: "z",
      contractVersion: "1.0",
    });
    expect(Object.keys(payload)).not.toEqual(expect.arrayContaining(["totalAmount"]));
    expect(payload).not.toHaveProperty("paymentDescription");
    expect(payload).not.toHaveProperty("phases");
  });
});

describe("formatPhone", () => {
  it("formats Brazilian numbers while typing", () => {
    expect(formatPhone("11988880000")).toBe("+55 (11) 98888-0000");
    expect(formatPhone("1198888")).toBe("+55 (11) 9888-8");
    expect(formatPhone("+5511988880000")).toBe("+55 (11) 98888-0000");
    expect(formatPhone("")).toBe("");
  });

  it("keeps numbers from other countries as typed", () => {
    expect(formatPhone("+39 333 123 4567")).toBe("+39 333 123 4567");
  });

  it("lets the user delete a punctuation mark", () => {
    expect(formatPhone("+55 (11) 988880000", "+55 (11) 98888-0000")).toBe("+55 (11) 9888-8000");
  });
});
