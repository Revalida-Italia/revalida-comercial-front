import { apiRequest } from "@/lib/http";
import { getSession } from "@/lib/session";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

export type ContractProductType = "PROGRAMA_REVALIDA_ITALIA" | "ESCOLA_DE_ITALIANO";
export type ContractStatus = "GENERATED" | "SIGNED";

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
  signerEmail?: string | null;
  coreUserId?: string | null;
}

export interface RevalidaContractPayload {
  productType: "PROGRAMA_REVALIDA_ITALIA";
  parties: Array<{
    id?: string;
    fullName: string;
    document: string;
    profession: string;
    email: string;
    phone: string;
    nationality?: string | null;
  }>;
  financialResponsibles?: Array<{
    fullName: string;
    document: string;
    email?: string | null;
    phone?: string | null;
  }>;
  liabilityRegime: "INDIVIDUAL" | "JOINT";
  modules: Array<{
    code: string;
    name: string;
    beneficiaryPartyIds: string[];
    activationCondition?: string | null;
    plannedReleaseOrTrigger?: string | null;
    effectiveReleaseDate?: string | null;
    accessPeriod?: string | null;
  }>;
  expenses: {
    translationsIncluded: boolean;
    apostillesIncluded: boolean;
    notaryServicesIncluded: boolean;
    postalExpensesIncluded: boolean;
    expensesScope?: string | null;
  };
  totalAmount: number;
  paymentDescription: string;
  phases: Array<{
    number: number;
    name: string;
    amount: number;
    dueDateOrTrigger: string;
    linkedModuleCodes: string[];
  }>;
  contractTerm: string;
  officialChannel: string;
  cancellationChannel: string;
  privacyNoticeUrl: string;
  signaturePlatform: string;
  contractVersion: string;
  graceDays?: number;
  terminationDays?: number;
  witnesses?: Array<{ fullName: string; document: string }>;
}

export interface SchoolContractPayload {
  productType: "ESCOLA_DE_ITALIANO";
  student: {
    fullName: string;
    birthDate: string;
    birthPlace: string;
    nationality: string;
    passport?: string | null;
    fullAddress: string;
    email: string;
    phone: string;
  };
  course: {
    purpose: "LANGUAGE" | "LANGUAGE_STUDY_VISA";
    durationMonths: number;
    startDate: string;
    endDate: string;
    weeklyHours: number;
    initialLevel: string;
    targetLevel: string;
  };
  distanceContract: boolean;
  totalAmount: number;
  paymentDescription: string;
  phases: Array<{
    number: number;
    name: string;
    amount: number;
    dueDateOrTrigger: string;
    linkedModuleCodes: string[];
  }>;
  officialChannel: string;
  cancellationChannel: string;
  signaturePlatform: string;
  contractVersion: string;
}

export type ContractFormPayload = RevalidaContractPayload | SchoolContractPayload;

export async function listContractModules(): Promise<ContractModule[]> {
  return apiRequest(CORE_API_URL, "/contracts/modules");
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

export async function provisionCoreStudent(
  contractId: string,
  body?: { email?: string; name?: string; document?: string; password?: string; sendAccessEmail?: boolean },
): Promise<{ coreUser: { id: string; email: string; name: string }; contractId: string }> {
  return apiRequest(CORE_API_URL, `/contracts/${contractId}/provision-core-student`, {
    method: "POST",
    body: body ?? {},
  });
}

export async function downloadContractPdf(contractId: string): Promise<void> {
  const session = getSession();
  const base = CORE_API_URL.endsWith("/") ? CORE_API_URL.slice(0, -1) : CORE_API_URL;
  const response = await fetch(`${base}/contracts/${contractId}/download`, {
    headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
  });

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as { code?: string; message?: string };
      message = payload.code ?? payload.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { url?: string };
    if (payload.url) {
      window.open(payload.url, "_blank", "noopener,noreferrer");
      return;
    }
    throw new Error("URL de download indisponível");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fileName = match?.[1] ?? `contrato-${contractId}.pdf`;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
