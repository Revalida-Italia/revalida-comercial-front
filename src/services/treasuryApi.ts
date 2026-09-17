import { apiRequest } from "@/lib/http";
import type { DisplayCurrency } from "@/services/exchangeRatesApi";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;
const TREASURY_BASE = "/api/treasury";

export type BankAccount = {
  id: string;
  name: string;
  institution: string;
  currency: DisplayCurrency;
  isActive: boolean;
  /** null = ainda não definido; depois de setado não edita (só via movimentos). */
  initialBalance?: number | null;
};

export type CostCenter = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
};

interface ListWrapper<T> {
  data?: T[];
  success?: boolean;
}

function unwrapArray<T>(payload: T[] | ListWrapper<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.data ?? [];
}

export async function listBankAccounts(): Promise<BankAccount[]> {
  const payload = await apiRequest<BankAccount[] | ListWrapper<BankAccount>>(
    CORE_API_URL,
    `${TREASURY_BASE}/bank-accounts`,
  );
  return unwrapArray(payload);
}

export async function createBankAccount(input: {
  name: string;
  institution: string;
  currency?: DisplayCurrency;
  initialBalance?: number | null;
}): Promise<BankAccount> {
  const payload = await apiRequest<{ data?: BankAccount } | BankAccount>(
    CORE_API_URL,
    `${TREASURY_BASE}/bank-accounts`,
    { method: "POST", body: input },
  );
  return "data" in payload && payload.data ? payload.data : (payload as BankAccount);
}

export async function setBankInitialBalance(id: string, amount: number): Promise<BankAccount> {
  const payload = await apiRequest<{ data?: BankAccount } | BankAccount>(
    CORE_API_URL,
    `${TREASURY_BASE}/bank-accounts/${id}/initial-balance`,
    { method: "POST", body: { amount } },
  );
  return "data" in payload && payload.data ? payload.data : (payload as BankAccount);
}

export async function updateBankAccount(
  id: string,
  input: Partial<{ name: string; institution: string; currency: DisplayCurrency; isActive: boolean }>,
): Promise<void> {
  await apiRequest(CORE_API_URL, `${TREASURY_BASE}/bank-accounts/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function removeBankAccount(id: string): Promise<void> {
  await apiRequest(CORE_API_URL, `${TREASURY_BASE}/bank-accounts/${id}`, { method: "DELETE" });
}

export async function listCostCenters(): Promise<CostCenter[]> {
  const payload = await apiRequest<CostCenter[] | ListWrapper<CostCenter>>(
    CORE_API_URL,
    `${TREASURY_BASE}/cost-centers`,
  );
  return unwrapArray(payload);
}

export async function createCostCenter(input: { name: string; code?: string }): Promise<CostCenter> {
  const payload = await apiRequest<{ data?: CostCenter } | CostCenter>(
    CORE_API_URL,
    `${TREASURY_BASE}/cost-centers`,
    { method: "POST", body: input },
  );
  return "data" in payload && payload.data ? payload.data : (payload as CostCenter);
}

export async function updateCostCenter(
  id: string,
  input: Partial<{ name: string; code: string | null; isActive: boolean }>,
): Promise<void> {
  await apiRequest(CORE_API_URL, `${TREASURY_BASE}/cost-centers/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function removeCostCenter(id: string): Promise<void> {
  await apiRequest(CORE_API_URL, `${TREASURY_BASE}/cost-centers/${id}`, { method: "DELETE" });
}

export type CashMovementKind = "MANUAL_RECEIVABLE" | "MANUAL_PAYABLE" | "REFUND";
export type CashMovementDirection = "IN" | "OUT";
export type CashMovementStatus = "PENDING" | "PAID" | "CANCELLED";

export type CashMovement = {
  id: string;
  direction: CashMovementDirection;
  kind: CashMovementKind;
  amount: number;
  currency: DisplayCurrency;
  originalCurrency?: DisplayCurrency | null;
  originalAmount?: number | null;
  usdRateBrl?: number | null;
  eurRateBrl?: number | null;
  exchangeRateDate?: string | null;
  exchangeRateSource?: string | null;
  dueDate: string;
  paidAt: string | null;
  status: CashMovementStatus;
  description: string | null;
  saleId: string | null;
  paymentId: string | null;
  bankAccount: { id: string; name: string; institution: string };
  costCenter: { id: string; name: string; code: string | null } | null;
};

export type BankBalanceRow = {
  bankAccount: {
    id: string;
    name: string;
    institution: string;
    currency: DisplayCurrency;
    initialBalance?: number | null;
  };
  balance: number;
};

export async function listCashMovements(params?: {
  month?: number;
  year?: number;
  bankAccountId?: string;
  kind?: CashMovementKind;
}): Promise<CashMovement[]> {
  const search = new URLSearchParams();
  if (params?.month != null) search.set("month", String(params.month));
  if (params?.year != null) search.set("year", String(params.year));
  if (params?.bankAccountId) search.set("bankAccountId", params.bankAccountId);
  if (params?.kind) search.set("kind", params.kind);
  const qs = search.toString();
  const payload = await apiRequest<CashMovement[] | ListWrapper<CashMovement>>(
    CORE_API_URL,
    `${TREASURY_BASE}/cash-movements${qs ? `?${qs}` : ""}`,
  );
  return unwrapArray(payload);
}

export async function createCashMovement(input: {
  direction: CashMovementDirection;
  kind: CashMovementKind;
  amount: number;
  currency?: DisplayCurrency;
  originalCurrency?: DisplayCurrency;
  dueDate: string;
  bankAccountId: string;
  costCenterId?: string | null;
  description?: string | null;
  status?: CashMovementStatus;
  paidAt?: string | null;
}): Promise<CashMovement> {
  const payload = await apiRequest<{ data?: CashMovement } | CashMovement>(
    CORE_API_URL,
    `${TREASURY_BASE}/cash-movements`,
    { method: "POST", body: input },
  );
  return "data" in payload && payload.data ? payload.data : (payload as CashMovement);
}

export async function removeCashMovement(id: string): Promise<void> {
  await apiRequest(CORE_API_URL, `${TREASURY_BASE}/cash-movements/${id}`, { method: "DELETE" });
}

export async function getBankBalanceReport(): Promise<BankBalanceRow[]> {
  const payload = await apiRequest<BankBalanceRow[] | ListWrapper<BankBalanceRow>>(
    CORE_API_URL,
    `${TREASURY_BASE}/reports/bank-balances`,
  );
  return unwrapArray(payload);
}
