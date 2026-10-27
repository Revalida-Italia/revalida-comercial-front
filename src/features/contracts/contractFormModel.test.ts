import { describe, expect, it } from "vitest";
import type { RevalidaContractPayload, RevalidaProduct, SchoolContractPayload } from "@/services/contractsApi";
import {
  buildRevalidaPayload,
  buildRevalidaSummary,
  buildSchoolPayload,
  buildSchoolSummaryRows,
  createInitialRevalidaState,
  formatPhone,
  schoolFormFromPrefill,
  newPartyState,
  paymentTotal,
  professionChoice,
  suggestTermEnd,
  validateRevalidaForm,
  validateSchoolForm,
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
        profession: "Médico",
        email: "billy@example.com",
        phone: "+55 (11) 98888-0000",
        nationality: "Brasileira",
      },
    ],
    decreeIncluded: false,
    products: [],
    expenses: { translationsIncluded: false, apostillesIncluded: false, postalExpensesIncluded: false },
    currency: "BRL",
    totalAmount: 25000,
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

const pay = { phases };

/** Breno's example: sale on 15/10/2026, term until 15/10/2028. */
function brenoState(): RevalidaFormState {
  const s = createInitialRevalidaState(prefill());
  s.decreeOn = true;
  s.products.START = { selected: true, releaseDate: "2026-10-15", durationMonths: "12" };
  s.products.ITALIANO_QUATTROMANI = { selected: true, releaseDate: "2026-10-15", durationMonths: "24" };
  s.products.PREPARACAO_PROVAS = { selected: true, releaseDate: "2027-10-15", durationMonths: "12" };
  s.products.ITALIANO_MEDICO = { selected: true, releaseDate: "2027-10-15", durationMonths: "12" };
  s.termEnd = "2028-10-15";
  s.referenceCity = "São Paulo";
  return s;
}

describe("initial state", () => {
  it("starts with nothing ticked, extras on Não, the sale date as start, no end date and Médico as profession", () => {
    const s = createInitialRevalidaState(prefill());
    expect(s.decreeOn).toBe(false);
    expect(Object.values(s.products).every((p) => !p.selected)).toBe(true);
    expect(Object.values(s.extras).every((v) => v === false)).toBe(true);
    expect(s.termStart).toBe("2026-10-15");
    expect(s.termEnd).toBe("");
    expect(s.parties[0].profession).toBe("Médico");
    expect(s.parties[0].professionIsOther).toBe(false);
    expect(s).not.toHaveProperty("witnesses");
  });

  it("keeps a typed profession as Outra", () => {
    const s = createInitialRevalidaState(prefill({ parties: [{ ...prefill().parties[0], profession: "Biomédico" }] }));
    expect(s.parties[0].professionIsOther).toBe(true);
    expect(professionChoice("Enfermeiro(a)")).toBe("nurse");
    expect(professionChoice("Biomédico")).toBe("other");
  });
});

describe("validateRevalidaForm", () => {
  it("accepts Breno's example", () => {
    expect(validateRevalidaForm(brenoState(), catalog, pay)).toEqual([]);
  });

  it("asks for what is included, the end of the term, the payment and the city", () => {
    const s = createInitialRevalidaState(prefill());
    const issues = validateRevalidaForm(s, catalog, { phases: [] });
    expect(issues.map((i) => i.summary)).toEqual([
      "Escolha pelo menos um produto ou serviço.",
      "Falta: fim da vigência",
      "Cadastre o pagamento da venda para gerar o contrato.",
      "Falta: cidade da assinatura",
    ]);
  });

  it("does not count the decree alone as included, but an extra is enough", () => {
    const s = brenoState();
    for (const code of Object.keys(s.products) as Array<keyof typeof s.products>) s.products[code].selected = false;
    expect(validateRevalidaForm(s, catalog, pay).map((i) => i.fieldId)).toEqual(["contract-product-START-toggle"]);
    s.extras.postalExpensesIncluded = true;
    expect(validateRevalidaForm(s, catalog, pay)).toEqual([]);
  });

  it("lists what is missing per contractor, naming the person", () => {
    const s = brenoState();
    s.parties[0].email = "";
    s.parties[0].phone = "";
    const summaries = validateRevalidaForm(s, catalog, pay).map((i) => i.summary);
    expect(summaries).toEqual(["Falta: e-mail de Billy Willy", "Falta: telefone de Billy Willy"]);
  });

  it("asks for the profession when Outra has no text", () => {
    const s = brenoState();
    s.parties[0].professionIsOther = true;
    s.parties[0].profession = " ";
    expect(validateRevalidaForm(s, catalog, pay).map((i) => i.fieldId)).toEqual(["contract-party-0-profession"]);
  });

  it("checks the start of the term against the end", () => {
    const s = brenoState();
    s.termStart = "2028-10-15";
    expect(validateRevalidaForm(s, catalog, pay).map((i) => i.message)).toEqual([
      "Escolha uma data depois de 15/10/2028.",
    ]);
  });

  it("requires a release date and a duration for each ticked product", () => {
    const s = brenoState();
    s.products.START = { selected: true, releaseDate: "", durationMonths: "" };
    const issues = validateRevalidaForm(s, catalog, pay);
    expect(issues.map((i) => i.fieldId)).toEqual(["contract-product-START-release", "contract-product-START-duration"]);
    expect(issues.map((i) => i.summary)).toEqual(["Falta: liberação de Curso Start", "Falta: duração de Curso Start"]);
  });

  it("rejects an invalid duration", () => {
    const s = brenoState();
    s.products.START.durationMonths = "0";
    s.products.ITALIANO_MEDICO.durationMonths = "61";
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
  it("is the latest end among the products", () => {
    expect(suggestTermEnd(brenoState())).toBe("2028-10-15");
  });

  it("is null when nothing has a duration", () => {
    const s = createInitialRevalidaState(prefill());
    s.products.ITALIANO_MEDICO = { selected: true, releaseDate: "2026-10-15", durationMonths: "" };
    expect(suggestTermEnd(s)).toBeNull();
  });
});

describe("buildRevalidaPayload", () => {
  it("sends the ticked products, profession and city, and no payment or witness fields", () => {
    const s = brenoState();
    s.parties.push({ ...newPartyState(), id: "p2", fullName: "Ana", document: "2", email: "a@a.com", phone: "+55 (11) 91111-2222", profession: "Fisioterapeuta" });
    const { payload, sentProductCodes } = buildRevalidaPayload(prefill(), s);
    expect(sentProductCodes).toEqual(["START", "PREPARACAO_PROVAS", "ITALIANO_MEDICO", "ITALIANO_QUATTROMANI"]);
    expect(payload.products?.[2]).toEqual({
      code: "ITALIANO_MEDICO",
      included: true,
      releaseDate: "2027-10-15",
      durationMonths: 12,
      endDate: null,
    });
    expect(payload.parties.map((p) => p.profession)).toEqual(["Médico", "Fisioterapeuta"]);
    expect(payload.decreeIncluded).toBe(true);
    expect(payload.contractEndDate).toBe("2028-10-15");
    expect(payload.contractStartDate).toBe("2026-10-15");
    expect(payload.referenceCity).toBe("São Paulo");
    for (const key of ["currency", "totalAmount", "phases", "witnesses", "liabilityRegime", "decreeReleaseDate", "decreeDurationMonths"]) {
      expect(payload).not.toHaveProperty(key);
    }
  });

  it("leaves unticked items out and keeps the decree off", () => {
    const s = brenoState();
    s.decreeOn = false;
    s.products.PREPARACAO_PROVAS.selected = false;
    s.extras.translationsIncluded = true;
    s.notes = "  ";
    const { payload } = buildRevalidaPayload(prefill(), s);
    expect(payload.products).toHaveLength(3);
    expect(payload.decreeIncluded).toBe(false);
    expect(payload.expenses).toEqual({ translationsIncluded: true, apostillesIncluded: false, postalExpensesIncluded: false });
    expect(payload.notes).toBeNull();
  });
});

describe("buildRevalidaSummary", () => {
  it("shows included with dates, not included extras and the term", () => {
    const s = brenoState();
    s.extras.apostillesIncluded = true;
    const summary = buildRevalidaSummary(s, catalog);
    expect(summary.contractors).toBe("1 contratante");
    expect(summary.included).toEqual([
      "Decreto",
      "Curso Start · 15/10/2026",
      "Preparação para as provas de revalidação · 15/10/2027",
      "Italiano Médico · 15/10/2027",
      "Italiano Quattromani · 15/10/2026",
      "Apostila de Haia",
    ]);
    expect(summary.notIncluded).toEqual(["Tradução juramentada", "Despesas postais"]);
    expect(summary.term).toBe("15/10/2028");
    expect(summary.termStart).toBe("15/10/2026");
  });
});

describe("Escola", () => {
  const student = {
    id: "s1",
    fullName: "Giulia Rossi",
    birthDate: "1994-03-12",
    birthPlace: "São Paulo",
    nationality: "brasiliana",
    passport: "",
    fullAddress: "Rua das Flores 100",
    email: "giulia@example.com",
    phone: "+55 (11) 98888-0000",
  };
  const school = (overrides: Partial<SchoolContractPayload> = {}): SchoolContractPayload => ({
    productType: "ESCOLA_DE_ITALIANO",
    students: [student],
    course: { durationMonths: 4, startDate: "2027-01-11" },
    referenceCity: "Pordenone",
    currency: "EUR",
    totalAmount: 2400,
    phases,
    contractVersion: "1.0",
    notes: null,
    ...overrides,
  });

  it("accepts a complete form and asks for each student, the course and the city", () => {
    expect(validateSchoolForm(school(), pay)).toEqual([]);
    const issues = validateSchoolForm(
      school({
        students: [student, { ...student, id: "s2", fullName: "", email: "x" }],
        course: { durationMonths: 0, startDate: "" },
        referenceCity: "",
      }),
      pay,
    );
    expect(issues.map((i) => i.summary)).toEqual([
      "Falta: nome do estudante 2",
      "Falta: e-mail válido de estudante 2",
      "Confira: duração do curso",
      "Falta: início do curso",
      "Falta: cidade da assinatura",
    ]);
  });

  it("leaves the payment fields out and sends every student", () => {
    const payload = buildSchoolPayload(school({ students: [student, { ...student, id: "s2", fullName: " Lucas " }] }));
    for (const key of ["currency", "totalAmount", "phases"]) expect(payload).not.toHaveProperty(key);
    expect(payload.students.map((s) => s.fullName)).toEqual(["Giulia Rossi", "Lucas"]);
    expect(payload.students[0].passport).toBeNull();
    expect(payload.course).toEqual({ durationMonths: 4, startDate: "2027-01-11" });
  });

  it("summarizes students and course", () => {
    expect(buildSchoolSummaryRows(school({ students: [student, { ...student, fullName: "Lucas" }] }))).toEqual([
      { label: "Estudante", value: "Giulia Rossi e mais 1" },
      { label: "Curso", value: "4 meses a partir de 11/01/2027" },
    ]);
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

  it("reads a leading 55 or +55 as the country code, never twice", () => {
    expect(formatPhone("5511911112222")).toBe("+55 (11) 91111-2222");
    expect(formatPhone("+5511911112222")).toBe("+55 (11) 91111-2222");
    expect(formatPhone("+55 11 91111-2222")).toBe("+55 (11) 91111-2222");
    expect(formatPhone("551133334444")).toBe("+55 (11) 3333-4444");
    expect(formatPhone("+551133334444")).toBe("+55 (11) 3333-4444");
  });

  it("formats 10 and 11 digit national numbers, including area code 55", () => {
    expect(formatPhone("1133334444")).toBe("+55 (11) 3333-4444");
    expect(formatPhone("11911112222")).toBe("+55 (11) 91111-2222");
    expect(formatPhone("55991112222")).toBe("+55 (55) 99111-2222");
    expect(formatPhone("+55 55 99111-2222")).toBe("+55 (55) 99111-2222");
  });

  it("is stable on its own output", () => {
    for (const value of ["+55 (11) 91111-2222", "+55 (11) 3333-4444", "+55 (55) 99111-2222"]) {
      expect(formatPhone(value)).toBe(value);
    }
  });

  it("types 5511911112222 digit by digit without duplicating the country code or cutting digits", () => {
    let value = "";
    for (const digit of "5511911112222") value = formatPhone(value + digit, value);
    expect(value).toBe("+55 (11) 91111-2222");
    value = "";
    for (const digit of "551133334444") value = formatPhone(value + digit, value);
    expect(value).toBe("+55 (11) 3333-4444");
  });

  it("keeps Italian numbers with +39 as typed", () => {
    expect(formatPhone("+39 333 123 4567")).toBe("+39 333 123 4567");
    expect(formatPhone("+393331234567")).toBe("+393331234567");
    expect(formatPhone("+39 0434 123456")).toBe("+39 0434 123456");
  });

  it("falls back to all the digits when the format is unknown, never truncating", () => {
    expect(formatPhone("393331234567")).toBe("393331234567");
    expect(formatPhone("0039 333 123 4567")).toBe("00393331234567");
    expect(formatPhone("+55 119111122223")).toBe("55119111122223");
    // A 12th digit typed over the mask: the mask's 55 is not a typed digit.
    expect(formatPhone("+55 (11) 91111-22223", "+55 (11) 91111-2222")).toBe("119111122223");
  });

  describe("typed key by key", () => {
    /** Types `keys` one at a time into the field, as the input does: each key goes after the shown value. */
    const typeKeys = (keys: string, start = "") => {
      let value = start;
      const shown: string[] = [];
      for (const key of keys) {
        value = formatPhone(value + key, value);
        shown.push(value);
      }
      return { value, shown };
    };

    it("keeps the spacing of +39 333 123 4567 as typed", () => {
      const { value, shown } = typeKeys("+39 333 123 4567");
      expect(value).toBe("+39 333 123 4567");
      expect(shown.slice(0, 5)).toEqual(["+", "+3", "+39", "+39 ", "+39 3"]);
    });

    it("keeps other country codes and their spacing as typed", () => {
      expect(typeKeys("+39 0434 123456").value).toBe("+39 0434 123456");
      expect(typeKeys("+1 (415) 555-0100").value).toBe("+1 (415) 555-0100");
      expect(typeKeys("+393331234567").value).toBe("+393331234567");
    });

    it("never counts the mask's 55 when the number goes past 11 digits", () => {
      const { value, shown } = typeKeys("123456789012345");
      expect(value).toBe("123456789012345");
      expect(shown[10]).toBe("+55 (12) 34567-8901");
      expect(shown[11]).toBe("123456789012");
      // Past 11 digits each step is exactly the digits typed so far.
      shown.slice(11).forEach((step, i) => expect(step).toBe("123456789012345".slice(0, 12 + i)));
    });

    it("goes back to the mask when digits are deleted down to 11", () => {
      expect(formatPhone("12345678901", "123456789012")).toBe("+55 (12) 34567-8901");
    });

    it("still reads a typed 55 or +55 as the country code", () => {
      expect(typeKeys("5511911112222").value).toBe("+55 (11) 91111-2222");
      expect(typeKeys("+5511911112222").value).toBe("+55 (11) 91111-2222");
      expect(typeKeys("+55 11 91111-2222").value).toBe("+55 (11) 91111-2222");
      expect(typeKeys("1133334444").value).toBe("+55 (11) 3333-4444");
      expect(typeKeys("55912345678").value).toBe("+55 (55) 91234-5678");
    });
  });

  it("formats the phone of a contracting party that comes from the sale", () => {
    const s = createInitialRevalidaState(prefill({ parties: [{ ...prefill().parties[0], phone: "5511911112222" }] }));
    expect(s.parties[0].phone).toBe("+55 (11) 91111-2222");
  });

  it("formats the phones that come from the sale", () => {
    expect(schoolFormFromPrefill({ students: [{ phone: "5511911112222" }, { phone: "+39 333 123 4567" }] }).students.map((s) => s.phone))
      .toEqual(["+55 (11) 91111-2222", "+39 333 123 4567"]);
  });
});
