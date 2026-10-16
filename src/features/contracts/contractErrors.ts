import type { RevalidaProduct, RevalidaProductCode } from "@/services/contractsApi";
import { MSG, productName, type FormIssue } from "@/features/contracts/contractFormModel";

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

/**
 * Turns the API validation errors into text in Portuguese, attached to the field they belong to.
 * The raw API text is never shown: whatever cannot be mapped becomes the generic banner.
 */
export function mapGenerateError(error: unknown, ctx: GenerateErrorContext): MappedGenerateError {
  const issues: FormIssue[] = [];
  let unmapped = false;

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
    const overTerm = raw.includes("vig") || raw.includes("term");

    let match = /^parties\.(\d+)\.(\w+)/.exec(field);
    if (match) {
      const i = Number(match[1]);
      const who = ctx.partyLabels[i] ?? `contratante ${i + 1}`;
      const prop = match[2];
      const id = `contract-party-${i}-${prop}`;
      if (prop === "email") push(id, MSG.email, `Falta: e-mail válido de ${who}`);
      else if (prop === "phone") push(id, MSG.phone, `Falta: telefone válido de ${who}`);
      else if (prop === "fullName" || prop === "document") {
        push(id, MSG.required, `Falta: ${prop === "fullName" ? "nome" : "documento"} de ${who}`);
      } else unmapped = true;
      continue;
    }

    match = /^products\.(\d+)(?:\.(\w+))?$/.exec(field);
    if (match) {
      const code0 = ctx.productCodes[Number(match[1])];
      if (!code0) {
        unmapped = true;
        continue;
      }
      const name = productName(code0, ctx.catalog);
      const prop = match[2];
      if (prop === "releaseDate") {
        push(
          `contract-product-${code0}-release`,
          raw.includes("antes do fim") ? "Escolha uma data de liberação antes do fim da vigência." : MSG.release,
          `Confira: liberação de ${name}`,
        );
      } else {
        push(
          `contract-product-${code0}-duration`,
          overTerm ? "Esse período passa do fim da vigência." : "Confira a duração e a data de fim.",
          `Confira: duração de ${name}`,
        );
      }
      continue;
    }

    if (field === "decreeReleaseDate") {
      push(
        "contract-decree-release",
        overTerm ? "O período do decreto passa do fim da vigência." : MSG.release,
        "Confira: liberação do decreto",
      );
      continue;
    }
    if (field === "decreeDurationMonths") {
      push("contract-decree-duration", MSG.months, "Confira: duração do decreto");
      continue;
    }
    if (field === "contractStartDate") {
      push("contract-term-start", "Escolha uma data de início válida para a vigência.", "Confira: início da vigência");
      continue;
    }
    if (field === "contractEndDate" || field === "contractDurationMonths") {
      push("contract-term-end", "Escolha uma data de fim válida para a vigência.", "Confira: fim da vigência");
      continue;
    }
    if (field === "phases" || field === "totalAmount" || code === "V-M8") {
      push("contract-section-payment", MSG.paymentMismatch, MSG.paymentMismatch);
      continue;
    }

    unmapped = true;
  }

  return { issues, banner: unmapped ? MSG.generic : null };
}
