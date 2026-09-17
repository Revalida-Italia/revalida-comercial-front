import type { SaleContract } from "@/services/contractsApi";

export type PortalStudentResultStatus = "created" | "already_exists" | "failed";

export interface PortalStudentResult {
  signerId?: string | null;
  email: string;
  name?: string | null;
  status: PortalStudentResultStatus;
  coreUserId?: string | null;
  error?: string | null;
}

export interface PortalStudentsSummary {
  created: number;
  alreadyExists: number;
  failed: number;
}

export interface CreatePortalStudentsResponse {
  contractId?: string;
  results: PortalStudentResult[];
  summary: PortalStudentsSummary;
}

const SIGNED_CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  CONTRACT_NOT_SIGNED: "Este contrato ainda não está assinado.",
  CONTRACT_ENVELOPE_MISSING: "Envelope do DocuSign não encontrado para este contrato.",
  DOCUSIGN_DOWNLOAD_FAILED: "Não foi possível baixar o PDF no DocuSign. Tente novamente.",
};

export function isSignedContract(contract: Pick<SaleContract, "status"> & {
  signedContract?: unknown;
}): boolean {
  return contract.status === "SIGNED" || contract.signedContract != null;
}

export function defaultPortalPasswordHint(year = new Date().getFullYear()): string {
  return `PRIMEIRONOME@${year}`;
}

export function portalStudentStatusLabel(status: PortalStudentResultStatus): string {
  const labels: Record<PortalStudentResultStatus, string> = {
    created: "Criado",
    already_exists: "Já existia",
    failed: "Falhou",
  };
  return labels[status];
}

export function summarizePortalStudentResults(results: PortalStudentResult[]): PortalStudentsSummary {
  return results.reduce(
    (acc, result) => {
      if (result.status === "created") acc.created += 1;
      else if (result.status === "already_exists") acc.alreadyExists += 1;
      else acc.failed += 1;
      return acc;
    },
    { created: 0, alreadyExists: 0, failed: 0 },
  );
}

export function formatPortalStudentsSummary(summary: PortalStudentsSummary): string {
  return `${summary.created} criado(s) · ${summary.alreadyExists} já existia(m) · ${summary.failed} falha(s)`;
}

export function mapSignedContractError(error: unknown): string {
  const code = readErrorCode(error);
  if (code && SIGNED_CONTRACT_ERROR_MESSAGES[code]) {
    return SIGNED_CONTRACT_ERROR_MESSAGES[code];
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Não foi possível concluir a operação.";
}

function readErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const record = error as { code?: unknown; message?: unknown };
  if (typeof record.code === "string" && SIGNED_CONTRACT_ERROR_MESSAGES[record.code]) {
    return record.code;
  }
  if (typeof record.message === "string" && SIGNED_CONTRACT_ERROR_MESSAGES[record.message]) {
    return record.message;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readCount(record: Record<string, unknown> | null, key: string): number | null {
  if (!record) return null;
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeStatus(value: unknown): PortalStudentResultStatus {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (raw === "created") return "created";
  if (raw === "already_exists") return "already_exists";
  return "failed";
}

function normalizeOne(value: unknown): PortalStudentResult {
  const record = asRecord(value) ?? {};
  return {
    signerId: readString(record, "signerId"),
    email: readString(record, "email") ?? "",
    name: readString(record, "name"),
    status: normalizeStatus(record.status),
    coreUserId: readString(record, "coreUserId"),
    error: readString(record, "error", "message"),
  };
}

export function normalizePortalStudentResults(payload: unknown): CreatePortalStudentsResponse {
  const record = asRecord(payload);
  if (!record || !Array.isArray(record.results)) {
    throw new Error("Resposta de criação de alunos fora do contrato esperado.");
  }

  const results = record.results.map(normalizeOne);
  const computed = summarizePortalStudentResults(results);
  const summaryRecord = asRecord(record.summary);

  return {
    contractId: readString(record, "contractId") ?? undefined,
    results,
    summary: {
      created: readCount(summaryRecord, "created") ?? computed.created,
      alreadyExists: readCount(summaryRecord, "alreadyExists") ?? computed.alreadyExists,
      failed: readCount(summaryRecord, "failed") ?? computed.failed,
    },
  };
}
