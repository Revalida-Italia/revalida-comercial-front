const ISO_DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

export function extractDateFromIso(iso?: string | null): string | null {
  if (!iso) {
    return null;
  }

  const match = iso.match(ISO_DATE_PREFIX);
  return match?.[1] ?? null;
}

export function formatDateInputLabel(dateValue: string): string {
  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) {
    return dateValue;
  }

  return `${day}/${month}/${year}`;
}

export function getTodayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isoToDateInputValue(iso?: string | null): string {
  return extractDateFromIso(iso) ?? "";
}

export function dateInputValueToIso(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error("INVALID_CAREER_PLAN_START_DATE");
  }

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    throw new Error("INVALID_CAREER_PLAN_START_DATE");
  }

  return parsed.toISOString();
}

export function formatCareerPlanStartDateLabel(iso?: string | null): string {
  const dateValue = extractDateFromIso(iso);
  if (!dateValue) {
    return "Não definida";
  }

  return formatDateInputLabel(dateValue);
}

const CAREER_PLAN_UPDATE_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CAREER_PLAN_START_DATE: "Data de início no plano inválida. Selecione uma data válida.",
  USER_NOT_FOUND: "Usuário não encontrado.",
  CAREER_PLAN_NOT_FOUND: "Plano de carreira não encontrado.",
};

export function getCareerPlanUpdateErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro ao atualizar carreira.";
  }

  return CAREER_PLAN_UPDATE_ERROR_MESSAGES[error.message] ?? error.message;
}
