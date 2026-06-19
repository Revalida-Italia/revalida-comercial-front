import { apiRequest } from "@/lib/http";
import type {
  CostCategory,
  CreateCostCategoryInput,
  CreateCostEventInput,
  MonthlyCostsResponse,
  UpdateCostCategoryInput,
  UpdateCostEventInput,
} from "@/features/costs-calendar/types";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;
const COSTS_CALENDAR_BASE_PATH = "/api/costs-calendar";

interface ListWrapper<T> {
  data?: T[];
}

function unwrapArray<T>(payload: T[] | ListWrapper<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.data ?? [];
}

export async function listCostCategories(): Promise<CostCategory[]> {
  const payload = await apiRequest<CostCategory[] | ListWrapper<CostCategory>>(
    CORE_API_URL,
    `${COSTS_CALENDAR_BASE_PATH}/categories`,
  );

  return unwrapArray(payload);
}

export async function createCostCategory(input: CreateCostCategoryInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, `${COSTS_CALENDAR_BASE_PATH}/categories`, {
    method: "POST",
    body: input,
  });
}

export async function updateCostCategory(id: string, input: UpdateCostCategoryInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, `${COSTS_CALENDAR_BASE_PATH}/categories/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteCostCategory(id: string): Promise<void> {
  await apiRequest<void>(CORE_API_URL, `${COSTS_CALENDAR_BASE_PATH}/categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function createCostEvent(input: CreateCostEventInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, `${COSTS_CALENDAR_BASE_PATH}/events`, {
    method: "POST",
    body: input,
  });
}

export async function updateCostEvent(id: string, input: UpdateCostEventInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, `${COSTS_CALENDAR_BASE_PATH}/events/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteCostEvent(id: string): Promise<void> {
  await apiRequest<void>(CORE_API_URL, `${COSTS_CALENDAR_BASE_PATH}/events/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

type GetMonthlyCostsInput = {
  month: number;
  year: number;
  categoryId?: string;
};

interface MonthlyResponseWrapper {
  data?: Partial<MonthlyCostsResponse>;
}

function normalizeMonthlyCostsResponse(
  payload: MonthlyCostsResponse | MonthlyResponseWrapper | Partial<MonthlyCostsResponse>,
  input: GetMonthlyCostsInput,
): MonthlyCostsResponse {
  const base = "data" in (payload as MonthlyResponseWrapper)
    ? ((payload as MonthlyResponseWrapper).data ?? {})
    : (payload as Partial<MonthlyCostsResponse>);

  return {
    month: typeof base.month === "number" ? base.month : input.month,
    year: typeof base.year === "number" ? base.year : input.year,
    totalAmount: typeof base.totalAmount === "number" ? base.totalAmount : 0,
    events: Array.isArray(base.events) ? base.events : [],
    dailyTotals: Array.isArray(base.dailyTotals) ? base.dailyTotals : [],
  };
}

export async function getMonthlyCosts(input: GetMonthlyCostsInput): Promise<MonthlyCostsResponse> {
  const params = new URLSearchParams({
    month: String(input.month),
    year: String(input.year),
  });

  if (input.categoryId) {
    params.set("categoryId", input.categoryId);
  }

  const payload = await apiRequest<MonthlyCostsResponse | MonthlyResponseWrapper | Partial<MonthlyCostsResponse>>(
    CORE_API_URL,
    `${COSTS_CALENDAR_BASE_PATH}/monthly?${params.toString()}`,
  );

  return normalizeMonthlyCostsResponse(payload, input);
}
