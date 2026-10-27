import { t } from "@/i18n";
import type { RevalidaProduct, RevalidaProductCode } from "@/services/contractsApi";
import { INCLUDED_FIELD_ID, MAX_MONTHS, productName, type FormIssue } from "@/features/contracts/contractFormModel";

export interface ApiIssue {
  code?: string;
  field?: string;
  message?: string;
}

export interface GenerateErrorContext {
  /** Product codes in the order they were sent. */
  productCodes: RevalidaProductCode[];
  catalog: RevalidaProduct[];
  /** Display names of the parties in the order they were sent. */
  partyLabels: string[];
  /** Display names of the students (Escola) in the order they were sent. */
  studentLabels?: string[];
}

export interface MappedGenerateError {
  issues: FormIssue[];
  /** Shown at the top of the Resumo when nothing more specific can be said. */
  banner: string | null;
}

function readIssues(error: unknown): ApiIssue[] {
  if (!error || typeof error !== "object") return [];
  const errors = (error as { errors?: unknown }).errors;
  return Array.isArray(errors) ? (errors as ApiIssue[]) : [];
}

const PARTY_MISSING = {
  document: "contract.missing.partyDocument",
  profession: "contract.missing.partyProfession",
} as const;

const STUDENT_MISSING = {
  birthDate: "contract.missing.studentBirthDate",
  birthPlace: "contract.missing.studentBirthPlace",
  nationality: "contract.missing.studentNationality",
  fullAddress: "contract.missing.studentAddress",
} as const;

/**
 * Turns the API validation errors into the screen language, attached to the field they belong to.
 * The raw API text is never shown: whatever cannot be mapped becomes the generic banner.
 */
export function mapGenerateError(error: unknown, ctx: GenerateErrorContext): MappedGenerateError {
  const issues: FormIssue[] = [];
  let unmapped = false;
  const required = t("contract.errors.required");

  const push = (fieldId: string, message: string, summary: string) => {
    if (!issues.some((issue) => issue.fieldId === fieldId && issue.message === message)) {
      issues.push({ id: `${fieldId}:${message}`, fieldId, message, summary });
    }
  };

  const list = readIssues(error);
  if (list.length === 0) unmapped = true;

  for (const item of list) {
    const field = item.field ?? "";
    const code = item.code ?? "";
    const raw = (item.message ?? "").toLowerCase();
    const overTerm = raw.includes("past the end") || raw.includes("vig");

    let match = /^parties\.(\d+)\.(\w+)/.exec(field);
    if (match) {
      const i = Number(match[1]);
      const who = ctx.partyLabels[i] ?? t("contract.party.fallbackName", { n: i + 1 });
      const prop = match[2];
      const id = `contract-party-${i}-${prop}`;
      if (prop === "email") push(id, t("contract.errors.email"), t("contract.missing.partyEmailValid", { who }));
      else if (prop === "phone") push(id, t("contract.errors.phone"), t("contract.missing.partyPhoneValid", { who }));
      else if (prop === "fullName") push(id, required, t("contract.missing.partyName", { n: i + 1 }));
      else if (prop in PARTY_MISSING) push(id, required, t(PARTY_MISSING[prop as keyof typeof PARTY_MISSING], { who }));
      else unmapped = true;
      continue;
    }

    match = /^students\.(\d+)\.(\w+)/.exec(field);
    if (match) {
      const i = Number(match[1]);
      const who = ctx.studentLabels?.[i] ?? t("contract.student.fallbackName", { n: i + 1 });
      const prop = match[2];
      const id = `contract-school-${i}-${prop}`;
      if (prop === "email") push(id, t("contract.errors.email"), t("contract.missing.studentEmailValid", { who }));
      else if (prop === "phone") push(id, t("contract.errors.phone"), t("contract.missing.studentPhoneValid", { who }));
      else if (prop === "fullName") push(id, required, t("contract.missing.studentName", { n: i + 1 }));
      else if (prop in STUDENT_MISSING) push(id, required, t(STUDENT_MISSING[prop as keyof typeof STUDENT_MISSING], { who }));
      else unmapped = true;
      continue;
    }

    if (field === "products" && code === "V_SERVICES") {
      push(INCLUDED_FIELD_ID, t("contract.errors.inclusion"), t("contract.errors.inclusion"));
      continue;
    }

    match = /^products\.(\d+)(?:\.(\w+))?$/.exec(field);
    if (match) {
      const productCode = ctx.productCodes[Number(match[1])];
      if (!productCode) {
        unmapped = true;
        continue;
      }
      const name = productName(productCode, ctx.catalog);
      const prop = match[2];
      if (prop === "releaseDate") {
        push(`contract-product-${productCode}-release`, t("contract.errors.release"), t("contract.missing.checkProductRelease", { name }));
      } else {
        push(
          `contract-product-${productCode}-duration`,
          overTerm ? t("contract.errors.periodOverTerm") : t("contract.errors.checkDuration"),
          t("contract.missing.checkProductDuration", { name }),
        );
      }
      continue;
    }

    if (field === "contractStartDate") {
      push("contract-term-start", t("contract.errors.termStartInvalid"), t("contract.missing.checkTermStart"));
      continue;
    }
    if (field === "contractEndDate" || field === "contractDurationMonths") {
      push("contract-term-end", t("contract.errors.termEndInvalid"), t("contract.missing.checkTermEnd"));
      continue;
    }
    if (field === "referenceCity") {
      push("contract-reference-city", required, t("contract.missing.city"));
      continue;
    }
    if (field === "course.durationMonths") {
      push("contract-school-durationMonths", t("contract.errors.months", { max: MAX_MONTHS }), t("contract.missing.courseMonths"));
      continue;
    }
    if (field === "course.startDate") {
      push("contract-school-startDate", t("contract.errors.startDate"), t("contract.missing.courseStart"));
      continue;
    }
    if (field === "phases" || field === "totalAmount" || code === "V-M8" || code === "V_PAYMENT") {
      push("contract-section-payment", t("contract.errors.paymentMismatch"), t("contract.errors.paymentMismatch"));
      continue;
    }

    unmapped = true;
  }

  return { issues, banner: unmapped ? t("contract.errors.generic") : null };
}
