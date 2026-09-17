import type { SaleContract } from "@/services/contractsApi";

export type PortalStudentResultStatus = "created" | "already_exists" | "failed";

export interface PortalStudentResult {
  email: string;
  name?: string | null;
  status: PortalStudentResultStatus;
  coreUserId?: string | null;
  temporaryPassword?: string | null;
  error?: string | null;
}

export interface CreatePortalStudentsResponse {
  results: PortalStudentResult[];
}

export function isSignedContract(contract: Pick<SaleContract, "status" | "signedAt"> & {
  signedContract?: { id?: string } | null;
  signedContractId?: string | null;
}): boolean {
  return (
    contract.status === "SIGNED" ||
    Boolean(contract.signedAt) ||
    Boolean(contract.signedContractId) ||
    Boolean(contract.signedContract?.id)
  );
}

export function defaultPortalPasswordHint(year = new Date().getFullYear()): string {
  return `PRIMEIRONOME@${year}`;
}

export function inferPortalPassword(name: string, year = new Date().getFullYear()): string {
  const firstName = name.trim().split(/\s+/)[0] ?? "";
  const normalized = firstName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();

  if (!normalized) {
    return defaultPortalPasswordHint(year);
  }

  return `${normalized}@${year}`;
}

export function portalStudentStatusLabel(status: PortalStudentResultStatus): string {
  const labels: Record<PortalStudentResultStatus, string> = {
    created: "Criado",
    already_exists: "Já existia",
    failed: "Falhou",
  };
  return labels[status];
}

export function summarizePortalStudentResults(results: PortalStudentResult[]): {
  created: number;
  alreadyExists: number;
  failed: number;
} {
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

export function formatPortalStudentsSummary(results: PortalStudentResult[]): string {
  const { created, alreadyExists, failed } = summarizePortalStudentResults(results);
  return `${created} criado(s) · ${alreadyExists} já existia(m) · ${failed} falha(s)`;
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

function normalizeStatus(value: unknown): PortalStudentResultStatus {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (["created", "create", "success", "ok", "provisioned"].includes(raw)) {
    return "created";
  }
  if (
    [
      "already_exists",
      "alreadyexists",
      "exists",
      "existing",
      "duplicate",
      "user_already_exists",
    ].includes(raw)
  ) {
    return "already_exists";
  }
  return "failed";
}

function normalizeOne(value: unknown, fallbackEmail = ""): PortalStudentResult {
  const record = asRecord(value) ?? {};
  const nestedUser = asRecord(record.coreUser) ?? asRecord(record.user);
  const email =
    readString(record, "email") ??
    (nestedUser ? readString(nestedUser, "email") : null) ??
    fallbackEmail;
  const name =
    readString(record, "name", "fullName") ??
    (nestedUser ? readString(nestedUser, "name", "fullName") : null);
  const explicitStatus = record.status ?? record.result ?? record.outcome;
  const status = explicitStatus
    ? normalizeStatus(explicitStatus)
    : record.error || record.message
      ? "failed"
      : "created";

  return {
    email,
    name,
    status,
    coreUserId:
      readString(record, "coreUserId", "userId", "id") ??
      (nestedUser ? readString(nestedUser, "id") : null),
    temporaryPassword: readString(
      record,
      "temporaryPassword",
      "password",
      "initialPassword",
    ),
    error: readString(record, "error", "message"),
  };
}

function mapListed(
  items: unknown[],
  status: PortalStudentResultStatus,
): PortalStudentResult[] {
  return items.map((item) => {
    if (typeof item === "string") {
      return { email: item, status };
    }
    return { ...normalizeOne(item), status };
  });
}

export function normalizePortalStudentResults(payload: unknown): CreatePortalStudentsResponse {
  const record = asRecord(payload);
  if (!record) {
    throw new Error("Resposta de criação de alunos fora do contrato esperado.");
  }

  if (Array.isArray(record.results)) {
    return { results: record.results.map((item) => normalizeOne(item)) };
  }
  if (Array.isArray(record.students)) {
    return { results: record.students.map((item) => normalizeOne(item)) };
  }
  if (Array.isArray(record.items)) {
    return { results: record.items.map((item) => normalizeOne(item)) };
  }

  const created = record.created;
  const alreadyExists = record.alreadyExists ?? record.already_exists;
  const failed = record.failed ?? record.errors;
  if (Array.isArray(created) || Array.isArray(alreadyExists) || Array.isArray(failed)) {
    return {
      results: [
        ...(Array.isArray(created) ? mapListed(created, "created") : []),
        ...(Array.isArray(alreadyExists) ? mapListed(alreadyExists, "already_exists") : []),
        ...(Array.isArray(failed) ? mapListed(failed, "failed") : []),
      ],
    };
  }

  if (typeof record.email === "string") {
    return { results: [normalizeOne(record)] };
  }

  throw new Error("Resposta de criação de alunos fora do contrato esperado.");
}
