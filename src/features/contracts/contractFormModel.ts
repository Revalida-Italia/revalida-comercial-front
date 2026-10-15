import { addMonthsIso, isoToDisplay } from "@/features/contracts/contractDates";
import type {
  RevalidaContractPayload,
  RevalidaProduct,
  RevalidaProductCode,
  RevalidaProductSelection,
  SchoolContractPayload,
} from "@/services/contractsApi";

export const PRODUCT_ORDER: RevalidaProductCode[] = [
  "START",
  "PREPARACAO_PROVAS",
  "ITALIANO_MEDICO",
  "ITALIANO_QUATTROMANI",
];

export const DEFAULT_DECREE_MONTHS = 6;
export const MAX_MONTHS = 60;

export type ExtraKey = keyof RevalidaContractPayload["expenses"];

export const EXTRAS: Array<{ key: ExtraKey; label: string }> = [
  { key: "translationsIncluded", label: "Tradução juramentada" },
  { key: "apostillesIncluded", label: "Apostilamento de Haia" },
  { key: "postalExpensesIncluded", label: "Envio postal" },
];

export const MODEL_NAMES: Record<string, string> = {
  PROGRAMA_REVALIDA_ITALIA: "Programa Revalida Itália",
  ESCOLA_DE_ITALIANO: "Escola de Italiano",
};

export interface PartyState {
  key: string;
  id?: string;
  fullName: string;
  document: string;
  nationality: string;
  email: string;
  phone: string;
}

export interface ProductState {
  selected: boolean;
  releaseDate: string;
  durationMonths: string;
}

export interface RevalidaFormState {
  parties: PartyState[];
  liabilityRegime: "INDIVIDUAL" | "JOINT";
  decreeOn: boolean;
  decreeRelease: string;
  decreeMonths: string;
  products: Record<RevalidaProductCode, ProductState>;
  extras: Record<ExtraKey, boolean>;
  termEnd: string;
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

  return {
    parties: prefill.parties.map((party) => ({
      key: newPartyKey(),
      id: party.id,
      fullName: party.fullName ?? "",
      document: party.document ?? "",
      nationality: party.nationality ?? "",
      email: party.email ?? "",
      phone: party.phone ?? "",
    })),
    liabilityRegime: prefill.liabilityRegime ?? "INDIVIDUAL",
    decreeOn: Boolean(prefill.decreeIncluded),
    decreeRelease: prefill.decreeReleaseDate ?? "",
    decreeMonths: String(prefill.decreeDurationMonths ?? DEFAULT_DECREE_MONTHS),
    products,
    extras: {
      translationsIncluded: Boolean(prefill.expenses?.translationsIncluded),
      apostillesIncluded: Boolean(prefill.expenses?.apostillesIncluded),
      postalExpensesIncluded: Boolean(prefill.expenses?.postalExpensesIncluded),
    },
    termEnd: prefill.contractEndDate ?? "",
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

/** Brazilian numbers are shown as +55 (11) 99999-9999; anything starting with another country code is kept. */
export function formatPhone(raw: string, previous = ""): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+") && !trimmed.startsWith("+55") && !/^\+5?$/.test(trimmed)) {
    return trimmed.replace(/[^\d+\s()-]/g, "");
  }
  let digits = raw.replace(/\D/g, "");
  // Deleting a punctuation mark leaves the digits unchanged: drop the last digit instead.
  const previousDigits = previous.replace(/\D/g, "");
  if (raw.length < previous.length && digits === previousDigits) digits = digits.slice(0, -1);
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  else if (digits.startsWith("55") && trimmed.startsWith("+")) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length === 0) return "";
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

function phoneDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

export function partyLabel(party: PartyState, index: number): string {
  return party.fullName.trim() || `contratante ${index + 1}`;
}

export interface PaymentContext {
  total: number;
  phases: Array<{ amount: number }>;
}

/** Latest release date among the ticked decree/products (ISO) or "". */
function latestRelease(state: RevalidaFormState): string {
  const dates: string[] = [];
  if (state.decreeOn && state.decreeRelease) dates.push(state.decreeRelease);
  for (const code of PRODUCT_ORDER) {
    const p = state.products[code];
    if (p.selected && p.releaseDate) dates.push(p.releaseDate);
  }
  const sorted = [...dates].sort();
  return sorted[sorted.length - 1] ?? "";
}

/** Latest end among decree and products that have a duration; null when none does. */
export function suggestTermEnd(state: RevalidaFormState): string | null {
  const ends: string[] = [];
  if (state.decreeOn) {
    const end = periodEnd(state.decreeRelease, state.decreeMonths);
    if (end) ends.push(end);
  }
  for (const code of PRODUCT_ORDER) {
    const p = state.products[code];
    if (!p.selected) continue;
    const end = periodEnd(p.releaseDate, p.durationMonths);
    if (end) ends.push(end);
  }
  const sorted = [...ends].sort();
  return sorted[sorted.length - 1] ?? null;
}

export function hasInclusion(state: RevalidaFormState): boolean {
  return state.decreeOn || PRODUCT_ORDER.some((code) => state.products[code].selected);
}

export const MSG = {
  required: "Obrigatório",
  email: "Digite um e-mail válido.",
  phone: "Digite um telefone válido.",
  release: "Escolha a data de liberação.",
  months: `Digite de 1 a ${MAX_MONTHS} meses.`,
  afterRelease: "Escolha uma data depois da liberação.",
  inclusion: "Escolha o que está incluso.",
  noPayment: "Cadastre o pagamento da venda para gerar o contrato.",
  paymentMismatch: "O valor total não confere com as parcelas. Ajuste o pagamento da venda.",
  termMissing: "Escolha a data de fim da vigência.",
  generic: "Não foi possível gerar o contrato. Tente novamente.",
} as const;

export function productName(code: RevalidaProductCode, catalog: RevalidaProduct[]): string {
  return catalog.find((p) => p.code === code)?.name ?? code;
}

export function validateRevalidaForm(
  state: RevalidaFormState,
  catalog: RevalidaProduct[],
  payment: PaymentContext,
  termStart: string | null,
): FormIssue[] {
  const issues: FormIssue[] = [];
  const add = (fieldId: string, message: string, summary: string) =>
    issues.push({ id: `${fieldId}:${message}`, fieldId, message, summary });

  state.parties.forEach((party, i) => {
    const who = partyLabel(party, i);
    const base = `contract-party-${i}`;
    if (!party.fullName.trim()) add(`${base}-fullName`, MSG.required, `Falta: nome do contratante ${i + 1}`);
    if (!party.document.trim()) add(`${base}-document`, MSG.required, `Falta: documento de ${who}`);
    if (!party.email.trim()) add(`${base}-email`, MSG.required, `Falta: e-mail de ${who}`);
    else if (!isValidEmail(party.email)) add(`${base}-email`, MSG.email, `Falta: e-mail válido de ${who}`);
    if (!party.phone.trim()) add(`${base}-phone`, MSG.required, `Falta: telefone de ${who}`);
    else if (phoneDigits(party.phone) < 8) add(`${base}-phone`, MSG.phone, `Falta: telefone válido de ${who}`);
  });

  if (!hasInclusion(state)) {
    add("contract-decree-toggle", MSG.inclusion, MSG.inclusion);
  }

  if (state.decreeOn) {
    if (!state.decreeRelease) add("contract-decree-release", MSG.release, "Falta: liberação do decreto");
    if (parseMonths(state.decreeMonths) === null) {
      add("contract-decree-duration", MSG.months, "Confira: duração do decreto");
    }
  }

  for (const code of PRODUCT_ORDER) {
    const p = state.products[code];
    if (!p.selected) continue;
    const name = productName(code, catalog);
    if (!p.releaseDate) add(`contract-product-${code}-release`, MSG.release, `Falta: liberação de ${name}`);
    if (p.durationMonths.trim() !== "" && parseMonths(p.durationMonths) === null) {
      add(`contract-product-${code}-duration`, MSG.months, `Confira: duração de ${name}`);
    }
  }

  // Term: required, after every release and not before the end of any period.
  if (!state.termEnd) {
    add("contract-term-end", MSG.termMissing, "Falta: fim da vigência");
  } else {
    const release = latestRelease(state);
    if (termStart && state.termEnd <= termStart) {
      add("contract-term-end", `Escolha uma data depois de ${isoToDisplay(termStart)}.`, "Confira: fim da vigência");
    } else if (release && state.termEnd <= release) {
      add("contract-term-end", MSG.afterRelease, "Confira: fim da vigência");
    } else {
      const suggestion = suggestTermEnd(state);
      if (suggestion && state.termEnd < suggestion) {
        add(
          "contract-term-end",
          `Essa data é antes do fim de um período. Escolha ${isoToDisplay(suggestion)} ou depois.`,
          "Confira: fim da vigência",
        );
      }
    }
  }

  if (payment.phases.length === 0) {
    add("contract-section-payment", MSG.noPayment, MSG.noPayment);
  } else {
    const sum = payment.phases.reduce((acc, phase) => acc + phase.amount, 0);
    if (Math.abs(sum - payment.total) > 0.02) {
      add("contract-section-payment", MSG.paymentMismatch, MSG.paymentMismatch);
    }
  }

  return issues;
}

export interface BuiltPayload {
  payload: RevalidaContractPayload;
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
      email: party.email.trim(),
      phone: party.phone.trim(),
      nationality: party.nationality.trim() || null,
    };
  });

  const payload: RevalidaContractPayload = {
    ...prefill,
    parties,
    liabilityRegime: parties.length > 1 ? state.liabilityRegime : "INDIVIDUAL",
    decreeIncluded: state.decreeOn,
    decreeReleaseDate: state.decreeOn ? state.decreeRelease || null : null,
    decreeDurationMonths: parseMonths(state.decreeMonths) ?? DEFAULT_DECREE_MONTHS,
    products: sentProducts,
    expenses: {
      translationsIncluded: state.extras.translationsIncluded,
      apostillesIncluded: state.extras.apostillesIncluded,
      postalExpensesIncluded: state.extras.postalExpensesIncluded,
    },
    contractEndDate: state.termEnd || null,
    contractDurationMonths: null,
    notes: state.notes.trim() ? state.notes.trim() : null,
  };

  return { payload, sentProductCodes: sentProducts.map((p) => p.code) };
}

export interface SummaryContent {
  contractors: string;
  included: string[];
  notIncluded: string[];
  term: string | null;
}

export function buildRevalidaSummary(
  state: RevalidaFormState,
  catalog: RevalidaProduct[],
): SummaryContent {
  const included: string[] = [];
  if (state.decreeOn) {
    const months = parseMonths(state.decreeMonths);
    included.push(months ? `Decreto · ${months} ${months === 1 ? "mês" : "meses"}` : "Decreto");
  }
  for (const code of PRODUCT_ORDER) {
    const p = state.products[code];
    if (!p.selected) continue;
    const name = productName(code, catalog);
    included.push(p.releaseDate ? `${name} · ${isoToDisplay(p.releaseDate)}` : name);
  }
  const notIncluded: string[] = [];
  for (const extra of EXTRAS) {
    (state.extras[extra.key] ? included : notIncluded).push(extra.label);
  }
  const n = state.parties.length;
  return {
    contractors: `${n} ${n === 1 ? "contratante" : "contratantes"}`,
    included,
    notIncluded,
    term: state.termEnd ? isoToDisplay(state.termEnd) : null,
  };
}

// ---- Escola de Italiano -------------------------------------------------

export function validateSchoolForm(
  payload: SchoolContractPayload,
  payment: PaymentContext,
): FormIssue[] {
  const issues: FormIssue[] = [];
  const add = (fieldId: string, message: string, summary: string) =>
    issues.push({ id: `${fieldId}:${message}`, fieldId, message, summary });
  const s = payload.student;
  if (!s.fullName.trim()) add("contract-school-fullName", MSG.required, "Falta: nome do estudante");
  if (!s.birthDate) add("contract-school-birthDate", "Escolha a data de nascimento.", "Falta: data de nascimento");
  if (!s.birthPlace.trim()) add("contract-school-birthPlace", MSG.required, "Falta: local de nascimento");
  if (!s.fullAddress.trim()) add("contract-school-fullAddress", MSG.required, "Falta: endereço completo");
  if (!s.email.trim()) add("contract-school-email", MSG.required, "Falta: e-mail do estudante");
  else if (!isValidEmail(s.email)) add("contract-school-email", MSG.email, "Falta: e-mail válido do estudante");
  if (!s.phone.trim()) add("contract-school-phone", MSG.required, "Falta: telefone do estudante");
  else if (phoneDigits(s.phone) < 8) add("contract-school-phone", MSG.phone, "Falta: telefone válido do estudante");
  if (!payload.course.startDate) add("contract-school-startDate", "Escolha a data de início.", "Falta: início do curso");
  if (!payload.course.endDate) add("contract-school-endDate", "Escolha a data de fim.", "Falta: fim do curso");
  else if (payload.course.startDate && payload.course.endDate <= payload.course.startDate) {
    add("contract-school-endDate", "Escolha uma data depois do início.", "Confira: fim do curso");
  }
  if (payment.phases.length === 0) {
    add("contract-section-payment", MSG.noPayment, MSG.noPayment);
  } else {
    const sum = payment.phases.reduce((acc, phase) => acc + phase.amount, 0);
    if (Math.abs(sum - payment.total) > 0.02) {
      add("contract-section-payment", MSG.paymentMismatch, MSG.paymentMismatch);
    }
  }
  return issues;
}
