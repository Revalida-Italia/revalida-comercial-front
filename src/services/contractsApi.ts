import {
  mapSignedContractError,
  normalizePortalStudentResults,
  type CreatePortalStudentsResponse,
} from "@/features/contracts/signedContract";
import { t } from "@/i18n";
import { apiRequest } from "@/lib/http";
import { getSession } from "@/lib/session";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

export type { CreatePortalStudentsResponse, PortalStudentResult } from "@/features/contracts/signedContract";

export type ContractProductType = "PROGRAMA_REVALIDA_ITALIA" | "ESCOLA_DE_ITALIANO";
export type ContractStatus = "GENERATED" | "SENT" | "SIGNED" | "DECLINED" | "VOIDED";

export interface ContractModule {
  code: string;
  name: string;
  eligibleProfessions: string[];
  description?: string | null;
}

export interface SaleContract {
  id: string;
  saleId: string;
  productType: ContractProductType;
  templateId: string;
  status: ContractStatus;
  documentHash?: string | null;
  generatedAt: string;
  s3Bucket?: string | null;
  s3Key?: string | null;
  fileName?: string | null;
  signedAt?: string | null;
  sentAt?: string | null;
  docusignEnvelopeId?: string | null;
  docusignUpdatedAt?: string | null;
  signerEmail?: string | null;
  /** Internal team note. Never printed on the contract. */
  internalNotes?: string | null;
  coreUserId?: string | null;
  signedContract?: {
    id: string;
    envelopeId?: string | null;
    completedAt?: string | null;
  } | null;
  signers?: Array<{
    id: string;
    name?: string | null;
    nameCiphertext?: string;
    email: string;
    recipientId: number;
    docusignStatus?: string | null;
    signedAt?: string | null;
    coreUserId?: string | null;
  }>;
}

export type RevalidaProductCode =
  | "START"
  | "PREPARACAO_PROVAS"
  | "ITALIANO_MEDICO"
  | "ITALIANO_QUATTROMANI";

/** Catalog entry from GET /contracts/revalida-products (description is the text printed in the contract). */
export interface RevalidaProduct {
  code: RevalidaProductCode;
  name: string;
  description: string;
}

/** Ticked product: release date (YYYY-MM-DD) and an optional duration in months or end date. */
export interface RevalidaProductSelection {
  code: RevalidaProductCode;
  included?: boolean;
  releaseDate?: string | null;
  durationMonths?: number | null;
  endDate?: string | null;
}

/** One installment line of the sale. A card installment line ("12 x R$ 1.000") has `installments` > 1. */
export interface ContractPaymentPhase {
  number: number;
  name: string;
  amount: number;
  /** Equal parcels this line stands for; the line is worth amount x installments. */
  installments?: number;
  dueDateOrTrigger: string;
  linkedModuleCodes: string[];
}

export type ContractCurrency = "BRL" | "EUR" | "USD";

export interface ContractWitness {
  fullName: string;
  document: string;
}

export interface RevalidaContractParty {
  id?: string;
  clientId?: string | null;
  fullName: string;
  document: string;
  /** Printed in the contract; Médico by default. */
  profession?: string | null;
  email: string;
  phone: string;
  nationality?: string | null;
}

export interface RevalidaContractPayload {
  productType: "PROGRAMA_REVALIDA_ITALIA";
  parties: RevalidaContractParty[];
  /** Adds Annex A to the contract. */
  decreeIncluded: boolean;
  products?: RevalidaProductSelection[];
  expenses: {
    translationsIncluded: boolean;
    apostillesIncluded: boolean;
    postalExpensesIncluded: boolean;
  };
  /** Read-only: the API takes currency, total and installments from the sale. Not sent. */
  currency?: ContractCurrency;
  totalAmount?: number;
  phases: ContractPaymentPhase[];
  /** Term of the contract (clause 3.1), YYYY-MM-DD: start plus end date or duration in months. */
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  contractDurationMonths?: number | null;
  /** City printed next to the signature date. */
  referenceCity: string;
  witnesses: ContractWitness[];
  contractVersion: string;
  notes?: string | null;
}

export interface SchoolStudent {
  id?: string;
  clientId?: string | null;
  fullName: string;
  /** YYYY-MM-DD */
  birthDate: string;
  birthPlace: string;
  nationality: string;
  passport?: string | null;
  fullAddress: string;
  email: string;
  phone: string;
}

export interface SchoolContractPayload {
  productType: "ESCOLA_DE_ITALIANO";
  students: SchoolStudent[];
  course: {
    durationMonths: number;
    /** YYYY-MM-DD */
    startDate: string;
  };
  referenceCity: string;
  currency?: ContractCurrency;
  totalAmount?: number;
  phases: ContractPaymentPhase[];
  contractVersion: string;
  notes?: string | null;
}

export type ContractFormPayload = RevalidaContractPayload | SchoolContractPayload;

/** What the form sends: payment is left out because the API takes it from the sale. Witnesses are fixed in the PDF and are not sent. */
export type PaymentFields = "currency" | "totalAmount" | "phases";
export type RevalidaGeneratePayload = Omit<RevalidaContractPayload, PaymentFields | "witnesses">;
export type SchoolGeneratePayload = Omit<SchoolContractPayload, PaymentFields>;

export async function listContractModules(): Promise<ContractModule[]> {
  return apiRequest(CORE_API_URL, "/contracts/modules");
}

export async function listRevalidaProducts(): Promise<RevalidaProduct[]> {
  return apiRequest(CORE_API_URL, "/contracts/revalida-products");
}

export async function listSaleContracts(saleId: string): Promise<SaleContract[]> {
  return apiRequest(CORE_API_URL, `/sales/${saleId}/contracts`);
}

export async function prefillContract(
  saleId: string,
  productType: ContractProductType = "PROGRAMA_REVALIDA_ITALIA",
): Promise<ContractFormPayload> {
  return apiRequest(
    CORE_API_URL,
    `/sales/${saleId}/contracts/prefill?productType=${encodeURIComponent(productType)}`,
  );
}

export async function generateContract(
  saleId: string,
  payload: unknown,
  productType: ContractProductType = "PROGRAMA_REVALIDA_ITALIA",
): Promise<SaleContract> {
  return apiRequest(CORE_API_URL, `/sales/${saleId}/contracts/generate`, {
    method: "POST",
    body: { productType, payload },
  });
}

export async function sendContractForSignature(contractId: string): Promise<SaleContract> {
  return apiRequest(CORE_API_URL, `/contracts/${contractId}/send-for-signature`, {
    method: "POST",
  });
}

export async function refreshContractSignatureStatus(contractId: string): Promise<SaleContract> {
  return apiRequest(CORE_API_URL, `/contracts/${contractId}/refresh-signature-status`, {
    method: "POST",
  });
}

export async function provisionCoreStudent(
  contractId: string,
  body?: { email?: string; name?: string; document?: string; password?: string; sendAccessEmail?: boolean },
): Promise<{ coreUser: { id: string; email: string; name: string }; contractId: string }> {
  return apiRequest(CORE_API_URL, `/contracts/${contractId}/provision-core-student`, {
    method: "POST",
    body: body ?? {},
  });
}

/** POST /contracts/:id/provision-portal-students — empty body; password is never returned. */
export async function createPortalStudents(
  contractId: string,
): Promise<CreatePortalStudentsResponse> {
  try {
    const payload = await apiRequest<unknown>(
      CORE_API_URL,
      `/contracts/${contractId}/provision-portal-students`,
      { method: "POST" },
    );
    return normalizePortalStudentResults(payload);
  } catch (error) {
    throw new Error(mapSignedContractError(error));
  }
}

export async function downloadContractPdf(contractId: string): Promise<void> {
  return downloadContractFile(`/contracts/${contractId}/download`, `contrato-${contractId}.pdf`);
}

/** GET /contracts/:id/signed-download — JWT blob stream of the DocuSign combined PDF. */
export async function downloadSignedContractPdf(contractId: string): Promise<void> {
  return downloadContractFile(
    `/contracts/${contractId}/signed-download`,
    `contrato-assinado-${contractId}.pdf`,
  );
}

async function downloadContractFile(path: string, fallbackFileName: string): Promise<void> {
  const session = getSession();
  const base = CORE_API_URL.endsWith("/") ? CORE_API_URL.slice(0, -1) : CORE_API_URL;
  const response = await fetch(`${base}${path}`, {
    headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
  });

  if (!response.ok) {
    let payload: { code?: string; message?: string } | undefined;
    try {
      payload = (await response.json()) as { code?: string; message?: string };
    } catch {
      // ignore
    }
    const error = new Error(payload?.message ?? payload?.code ?? `Erro HTTP ${response.status}`) as Error & {
      code?: string;
      status?: number;
    };
    error.code = payload?.code;
    error.status = response.status;
    throw new Error(mapSignedContractError(error));
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { url?: string };
    if (payload.url) {
      window.open(payload.url, "_blank", "noopener,noreferrer");
      return;
    }
    throw new Error(t("contract.errors.downloadUnavailable"));
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fileName = match?.[1] ?? fallbackFileName;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
