import { t, tCount } from "@/i18n";
import { addMonthsIso, isoToDisplay } from "@/features/contracts/contractDates";
import type {
  ContractPaymentPhase,
  ContractProductType,
  RevalidaContractPayload,
  RevalidaGeneratePayload,
  RevalidaProduct,
  RevalidaProductCode,
  RevalidaProductSelection,
  SchoolContractPayload,
  SchoolGeneratePayload,
  SchoolStudent,
} from "@/services/contractsApi";

export const PRODUCT_ORDER: RevalidaProductCode[] = [
  "START",
  "PREPARACAO_PROVAS",
  "ITALIANO_MEDICO",
  "ITALIANO_QUATTROMANI",
];

export const MAX_MONTHS = 60;

export type ExtraKey = keyof RevalidaContractPayload["expenses"];

export const EXTRA_KEYS: ExtraKey[] = ["translationsIncluded", "apostillesIncluded", "postalExpensesIncluded"];

export function extraLabel(key: ExtraKey): string {
  return t(`contract.extras.${key}`);
}

export function modelName(productType: ContractProductType): string {
  return productType === "ESCOLA_DE_ITALIANO" ? t("contract.models.school") : t("contract.models.revalida");
}

/**
 * Professions offered for each contracting party. `value` is what the contract prints
 * ("profissão Médico"), so it stays the same whatever the screen language.
 */
export const PROFESSIONS = [
  { id: "doctor", value: "Médico" },
  { id: "nurse", value: "Enfermeiro(a)" },
  { id: "physiotherapist", value: "Fisioterapeuta" },
  { id: "dentist", value: "Odontólogo(a)" },
  { id: "pharmacist", value: "Farmacêutico(a)" },
] as const;

export type ProfessionChoice = (typeof PROFESSIONS)[number]["id"] | "other";

export const DEFAULT_PROFESSION = PROFESSIONS[0].value;

export function professionChoice(value: string): ProfessionChoice {
  return PROFESSIONS.find((option) => option.value === value)?.id ?? "other";
}

export interface PartyState {
  key: string;
  id?: string;
  fullName: string;
  document: string;
  nationality: string;
  email: string;
  phone: string;
  /** Printed value: one of PROFESSIONS or what was typed under "Outra". */
  profession: string;
  /** "Outra" picked: the typed text is the profession. */
  professionIsOther: boolean;
}

export interface ProductState {
  selected: boolean;
  releaseDate: string;
  durationMonths: string;
}

export interface WitnessState {
  fullName: string;
  document: string;
}

export interface RevalidaFormState {
  parties: PartyState[];
  decreeOn: boolean;
  products: Record<RevalidaProductCode, ProductState>;
  extras: Record<ExtraKey, boolean>;
  /** Start of the contract term (ISO); starts as the sale date. */
  termStart: string;
  termEnd: string;
  referenceCity: string;
  witnesses: [WitnessState, WitnessState];
  notes: string;
}

/** A thing the user still has to fix. `fieldId` is the DOM id that gets focus. */
export interface FormIssue {
  id: string;
  fieldId: string;
  /** Text under the field. */
  message: string;
  /** Text in the Resumo list. */
  summary: string;
}

let partyCounter = 0;
export function newPartyKey(): string {
  partyCounter += 1;
  return `party-${partyCounter}`;
}

export function newPartyId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `party-id-${Date.now()}-${partyCounter}`;
}

export function emptyProductState(): ProductState {
  return { selected: false, releaseDate: "", durationMonths: "" };
}

export function newPartyState(): PartyState {
  return {
    key: newPartyKey(),
    id: newPartyId(),
    fullName: "",
    document: "",
    nationality: "Brasileira",
    email: "",
    phone: "",
    profession: DEFAULT_PROFESSION,
    professionIsOther: false,
  };
}

export function createInitialRevalidaState(prefill: RevalidaContractPayload): RevalidaFormState {
  const products = {} as Record<RevalidaProductCode, ProductState>;
  for (const code of PRODUCT_ORDER) products[code] = emptyProductState();
  for (const sel of prefill.products ?? []) {
    if (sel.included === false || !PRODUCT_ORDER.includes(sel.code)) continue;
    products[sel.code] = {
      selected: true,
      releaseDate: sel.releaseDate ?? "",
      durationMonths: sel.durationMonths ? String(sel.durationMonths) : "",
    };
  }
  const witness = (index: number): WitnessState => ({
    fullName: prefill.witnesses?.[index]?.fullName ?? "",
    document: prefill.witnesses?.[index]?.document ?? "",
  });

  return {
    parties: prefill.parties.map((party) => {
      const profession = party.profession?.trim() || DEFAULT_PROFESSION;
      return {
        key: newPartyKey(),
        id: party.id,
        fullName: party.fullName ?? "",
        document: party.document ?? "",
        nationality: party.nationality ?? "",
        email: party.email ?? "",
        phone: formatPhone(party.phone ?? ""),
        profession,
        professionIsOther: professionChoice(profession) === "other",
      };
    }),
    decreeOn: Boolean(prefill.decreeIncluded),
    products,
    extras: {
      translationsIncluded: Boolean(prefill.expenses?.translationsIncluded),
      apostillesIncluded: Boolean(prefill.expenses?.apostillesIncluded),
      postalExpensesIncluded: Boolean(prefill.expenses?.postalExpensesIncluded),
    },
    termStart: prefill.contractStartDate ?? "",
    termEnd: prefill.contractEndDate ?? "",
    referenceCity: prefill.referenceCity ?? "",
    witnesses: [witness(0), witness(1)],
    notes: prefill.notes ?? "",
  };
}

export function parseMonths(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n >= 1 && n <= MAX_MONTHS ? n : null;
}

/** End of a period (release + months), or null when something is missing. */
export function periodEnd(releaseDate: string, months: string): string | null {
  if (!releaseDate) return null;
  const n = parseMonths(months);
  return n === null ? null : addMonthsIso(releaseDate, n);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

const BRAZIL_CODE = "55";
const MAX_NATIONAL_DIGITS = 11;

/**
 * Phone shown in the form and printed in both contracts.
 * - Brazilian numbers, with or without a leading 55 / +55, with 10 or 11 digits after it:
 *   +55 (11) 9999-9999 or +55 (11) 99999-9999 (formatted as the digits are typed).
 * - A number typed with another country code ("+39 333 123 4567") is kept as typed.
 * - Anything else that does not fit (too many digits) falls back to all of its digits; a digit is
 *   never dropped.
 * `previous` is the value before the edit, so deleting a punctuation mark removes a digit instead.
 */
export function formatPhone(raw: string, previous = ""): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const international = trimmed.startsWith("+");
  if (international && !/^\+5(5|$)/.test(trimmed)) return trimmed.replace(/[^\d+\s()-]/g, "");

  let digits = trimmed.replace(/\D/g, "");
  // Deleting a punctuation mark leaves the digits unchanged: drop the last digit instead.
  const previousDigits = previous.replace(/\D/g, "");
  if (raw.length < previous.length && digits === previousDigits) digits = digits.slice(0, -1);
  const allDigits = digits;

  if (international) {
    if (digits === "5") return "+5";
    digits = digits.slice(BRAZIL_CODE.length);
    if (!digits) return previous.length > raw.length ? "" : "+55";
  }
  // A leading 55 is the country code when the rest is a whole national number (10 or 11 digits).
  // This also fixes a value that was masked with 55 as the area code before the last digits came.
  if (digits.length > MAX_NATIONAL_DIGITS && digits.startsWith(BRAZIL_CODE)) {
    digits = digits.slice(BRAZIL_CODE.length);
  }
  if (digits.length > MAX_NATIONAL_DIGITS) return allDigits;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  let out = `+55 (${ddd}`;
  if (digits.length >= 2) out += ")";
  if (rest.length > 0) {
    const split = digits.length > 10 ? 5 : 4;
    out += ` ${rest.slice(0, split)}`;
    if (rest.length > split) out += `-${rest.slice(split)}`;
  }
  return out;
}

/** School prefill with the students' phones in the same format as typed ones. */
export function schoolFormFromPrefill<T extends { students: Array<{ phone?: string | null }> }>(prefill: T): T {
  return {
    ...prefill,
    students: prefill.students.map((student) => ({ ...student, phone: formatPhone(student.phone ?? "") })),
  };
}

function phoneDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

export function partyLabel(party: Pick<PartyState, "fullName">, index: number): string {
  return party.fullName.trim() || t("contract.party.fallbackName", { n: index + 1 });
}

export function studentLabel(student: Pick<SchoolStudent, "fullName">, index: number): string {
  return student.fullName.trim() || t("contract.student.fallbackName", { n: index + 1 });
}

export interface PaymentContext {
  phases: ContractPaymentPhase[];
}

/** A card installment line ("12 x R$ 1.000") counts all its parcels. */
export function phaseParcels(phase: Pick<ContractPaymentPhase, "installments">): number {
  return phase.installments && phase.installments > 1 ? phase.installments : 1;
}

/** Whole value of the contract: the sum of the installments of the sale, rounded to cents. */
export function paymentTotal(phases: ContractPaymentPhase[], fallback = 0): number {
  if (phases.length === 0) return fallback;
  return Math.round(phases.reduce((sum, phase) => sum + phase.amount * phaseParcels(phase), 0) * 100) / 100;
}

/** Latest release date among the ticked products (ISO) or "". */
function latestRelease(state: RevalidaFormState): string {
  const dates: string[] = [];
  for (const code of PRODUCT_ORDER) {
    const p = state.products[code];
    if (p.selected && p.releaseDate) dates.push(p.releaseDate);
  }
  const sorted = [...dates].sort();
  return sorted[sorted.length - 1] ?? "";
}

/** Latest end among the ticked products that have a duration; null when none does. */
export function suggestTermEnd(state: RevalidaFormState): string | null {
  const ends: string[] = [];
  for (const code of PRODUCT_ORDER) {
    const p = state.products[code];
    if (!p.selected) continue;
    const end = periodEnd(p.releaseDate, p.durationMonths);
    if (end) ends.push(end);
  }
  const sorted = [...ends].sort();
  return sorted[sorted.length - 1] ?? null;
}

/** Clause 3.2 lists the ticked products and extras: at least one is needed. */
export function hasInclusion(state: RevalidaFormState): boolean {
  return PRODUCT_ORDER.some((code) => state.products[code].selected) || EXTRA_KEYS.some((key) => state.extras[key]);
}

/** Field that gets focus when nothing is included. */
export const INCLUDED_FIELD_ID = `contract-product-${PRODUCT_ORDER[0]}-toggle`;

export function productName(code: RevalidaProductCode, catalog: RevalidaProduct[]): string {
  return catalog.find((p) => p.code === code)?.name ?? code;
}

function issueList() {
  const issues: FormIssue[] = [];
  const add = (fieldId: string, message: string, summary: string) =>
    issues.push({ id: `${fieldId}:${message}`, fieldId, message, summary });
  return { issues, add };
}

export function validateRevalidaForm(
  state: RevalidaFormState,
  catalog: RevalidaProduct[],
  payment: PaymentContext,
): FormIssue[] {
  const { issues, add } = issueList();
  const required = t("contract.errors.required");

  state.parties.forEach((party, i) => {
    const who = partyLabel(party, i);
    const base = `contract-party-${i}`;
    if (!party.fullName.trim()) add(`${base}-fullName`, required, t("contract.missing.partyName", { n: i + 1 }));
    if (!party.document.trim()) add(`${base}-document`, required, t("contract.missing.partyDocument", { who }));
    if (!party.profession.trim()) add(`${base}-profession`, required, t("contract.missing.partyProfession", { who }));
    if (!party.email.trim()) add(`${base}-email`, required, t("contract.missing.partyEmail", { who }));
    else if (!isValidEmail(party.email)) {
      add(`${base}-email`, t("contract.errors.email"), t("contract.missing.partyEmailValid", { who }));
    }
    if (!party.phone.trim()) add(`${base}-phone`, required, t("contract.missing.partyPhone", { who }));
    else if (phoneDigits(party.phone) < 8) {
      add(`${base}-phone`, t("contract.errors.phone"), t("contract.missing.partyPhoneValid", { who }));
    }
  });

  if (!hasInclusion(state)) {
    add(INCLUDED_FIELD_ID, t("contract.errors.inclusion"), t("contract.errors.inclusion"));
  }

  for (const code of PRODUCT_ORDER) {
    const p = state.products[code];
    if (!p.selected) continue;
    const name = productName(code, catalog);
    if (!p.releaseDate) {
      add(`contract-product-${code}-release`, t("contract.errors.release"), t("contract.missing.productRelease", { name }));
    }
    if (p.durationMonths.trim() === "") {
      add(`contract-product-${code}-duration`, t("contract.errors.months", { max: MAX_MONTHS }), t("contract.missing.productDuration", { name }));
    } else if (parseMonths(p.durationMonths) === null) {
      add(`contract-product-${code}-duration`, t("contract.errors.months", { max: MAX_MONTHS }), t("contract.missing.checkProductDuration", { name }));
    }
  }

  // Term: the end is required, after the start, after every release and not before the end of any period.
  const checkTermEnd = t("contract.missing.checkTermEnd");
  if (!state.termEnd) {
    add("contract-term-end", t("contract.errors.termMissing"), t("contract.missing.termEnd"));
  } else {
    const release = latestRelease(state);
    const termStart = state.termStart;
    if (termStart && state.termEnd <= termStart) {
      add("contract-term-end", t("contract.errors.termAfter", { date: isoToDisplay(termStart) }), checkTermEnd);
    } else if (release && state.termEnd <= release) {
      add("contract-term-end", t("contract.errors.afterRelease"), checkTermEnd);
    } else {
      const suggestion = suggestTermEnd(state);
      if (suggestion && state.termEnd < suggestion) {
        add("contract-term-end", t("contract.errors.termBeforePeriod", { date: isoToDisplay(suggestion) }), checkTermEnd);
      }
    }
  }

  if (payment.phases.length === 0) {
    add("contract-section-payment", t("contract.errors.noPayment"), t("contract.errors.noPayment"));
  }

  if (!state.referenceCity.trim()) add("contract-reference-city", required, t("contract.missing.city"));
  state.witnesses.forEach((witness, i) => {
    const n = i + 1;
    if (!witness.fullName.trim()) add(`contract-witness-${i}-fullName`, required, t("contract.missing.witnessName", { n }));
    if (!witness.document.trim()) add(`contract-witness-${i}-document`, required, t("contract.missing.witnessDocument", { n }));
  });

  return issues;
}

/** Payment is read-only: the API takes currency, total and installments from the sale. */
function withoutPayment<T extends { currency?: unknown; totalAmount?: number; phases?: unknown }>(
  payload: T,
): Omit<T, "currency" | "totalAmount" | "phases"> {
  const { currency, totalAmount, phases, ...rest } = payload;
  void [currency, totalAmount, phases];
  return rest;
}

export function buildSchoolPayload(payload: SchoolContractPayload): SchoolGeneratePayload {
  const sent = withoutPayment(payload);
  return {
    ...sent,
    students: payload.students.map((student) => ({
      ...student,
      fullName: student.fullName.trim(),
      birthPlace: student.birthPlace.trim(),
      nationality: student.nationality.trim(),
      passport: student.passport?.trim() || null,
      fullAddress: student.fullAddress.trim(),
      email: student.email.trim(),
      phone: student.phone.trim(),
    })),
    referenceCity: payload.referenceCity.trim(),
    notes: payload.notes?.trim() ? payload.notes.trim() : null,
  };
}

export interface BuiltPayload {
  payload: RevalidaGeneratePayload;
  /** Product codes in the order they were sent (the API reports errors by position). */
  sentProductCodes: RevalidaProductCode[];
}

export function buildRevalidaPayload(
  prefill: RevalidaContractPayload,
  state: RevalidaFormState,
): BuiltPayload {
  const sentProducts: RevalidaProductSelection[] = [];
  for (const code of PRODUCT_ORDER) {
    const p = state.products[code];
    if (!p.selected) continue;
    sentProducts.push({
      code,
      included: true,
      releaseDate: p.releaseDate || null,
      durationMonths: parseMonths(p.durationMonths),
      endDate: null,
    });
  }

  const prefillParties = new Map(prefill.parties.map((party) => [party.id, party]));
  const parties = state.parties.map((party) => {
    const original = party.id ? prefillParties.get(party.id) : undefined;
    return {
      ...(original ?? {}),
      id: party.id ?? party.key,
      fullName: party.fullName.trim(),
      document: party.document.trim(),
      profession: party.profession.trim(),
      email: party.email.trim(),
      phone: party.phone.trim(),
      nationality: party.nationality.trim() || null,
    };
  });

  const payload: RevalidaGeneratePayload = {
    ...withoutPayment(prefill),
    parties,
    decreeIncluded: state.decreeOn,
    products: sentProducts,
    expenses: { ...state.extras },
    contractStartDate: state.termStart || null,
    contractEndDate: state.termEnd || null,
    contractDurationMonths: null,
    referenceCity: state.referenceCity.trim(),
    witnesses: state.witnesses.map((witness) => ({
      fullName: witness.fullName.trim(),
      document: witness.document.trim(),
    })),
    notes: state.notes.trim() ? state.notes.trim() : null,
  };

  return { payload, sentProductCodes: sentProducts.map((p) => p.code) };
}

export interface SummaryContent {
  contractors: string;
  included: string[];
  notIncluded: string[];
  term: string | null;
  termStart: string | null;
}

export function buildRevalidaSummary(
  state: RevalidaFormState,
  catalog: RevalidaProduct[],
): SummaryContent {
  const included: string[] = [];
  if (state.decreeOn) included.push(t("contract.summary.decree"));
  for (const code of PRODUCT_ORDER) {
    const p = state.products[code];
    if (!p.selected) continue;
    const name = productName(code, catalog);
    included.push(p.releaseDate ? t("contract.summary.productWithDate", { name, date: isoToDisplay(p.releaseDate) }) : name);
  }
  const notIncluded: string[] = [];
  for (const key of EXTRA_KEYS) {
    (state.extras[key] ? included : notIncluded).push(extraLabel(key));
  }
  return {
    contractors: tCount("contract.summary.contractors", state.parties.length),
    included,
    notIncluded,
    term: state.termEnd ? isoToDisplay(state.termEnd) : null,
    termStart: state.termStart ? isoToDisplay(state.termStart) : null,
  };
}

// ---- Escola de Italiano -------------------------------------------------

export function newStudent(): SchoolStudent {
  return {
    id: newPartyId(),
    fullName: "",
    birthDate: "",
    birthPlace: "",
    nationality: "",
    passport: null,
    fullAddress: "",
    email: "",
    phone: "",
  };
}

export function validateSchoolForm(
  payload: SchoolContractPayload,
  payment: PaymentContext,
): FormIssue[] {
  const { issues, add } = issueList();
  const required = t("contract.errors.required");

  payload.students.forEach((s, i) => {
    const who = studentLabel(s, i);
    const base = `contract-school-${i}`;
    if (!s.fullName.trim()) add(`${base}-fullName`, required, t("contract.missing.studentName", { n: i + 1 }));
    if (!s.birthDate) add(`${base}-birthDate`, t("contract.errors.birthDate"), t("contract.missing.studentBirthDate", { who }));
    if (!s.birthPlace.trim()) add(`${base}-birthPlace`, required, t("contract.missing.studentBirthPlace", { who }));
    if (!s.nationality.trim()) add(`${base}-nationality`, required, t("contract.missing.studentNationality", { who }));
    if (!s.fullAddress.trim()) add(`${base}-fullAddress`, required, t("contract.missing.studentAddress", { who }));
    if (!s.email.trim()) add(`${base}-email`, required, t("contract.missing.studentEmail", { who }));
    else if (!isValidEmail(s.email)) {
      add(`${base}-email`, t("contract.errors.email"), t("contract.missing.studentEmailValid", { who }));
    }
    if (!s.phone.trim()) add(`${base}-phone`, required, t("contract.missing.studentPhone", { who }));
    else if (phoneDigits(s.phone) < 8) {
      add(`${base}-phone`, t("contract.errors.phone"), t("contract.missing.studentPhoneValid", { who }));
    }
  });

  const months = payload.course.durationMonths;
  if (!Number.isInteger(months) || months < 1 || months > MAX_MONTHS) {
    add("contract-school-durationMonths", t("contract.errors.months", { max: MAX_MONTHS }), t("contract.missing.courseMonths"));
  }
  if (!payload.course.startDate) {
    add("contract-school-startDate", t("contract.errors.startDate"), t("contract.missing.courseStart"));
  }
  if (payment.phases.length === 0) {
    add("contract-section-payment", t("contract.errors.noPayment"), t("contract.errors.noPayment"));
  }
  if (!payload.referenceCity.trim()) add("contract-reference-city", required, t("contract.missing.city"));
  return issues;
}

export function buildSchoolSummaryRows(payload: SchoolContractPayload): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  const names = payload.students.map((s) => s.fullName.trim()).filter(Boolean);
  if (names.length > 0) {
    rows.push({
      label: t("contract.summary.student"),
      value: names.length === 1 ? names[0] : t("contract.summary.andMore", { first: names[0], count: names.length - 1 }),
    });
  }
  if (payload.course.startDate && payload.course.durationMonths > 0) {
    rows.push({
      label: t("contract.summary.course"),
      value: t("contract.summary.courseValue", {
        months: tCount("contract.summary.months", payload.course.durationMonths),
        date: isoToDisplay(payload.course.startDate),
      }),
    });
  }
  return rows;
}
