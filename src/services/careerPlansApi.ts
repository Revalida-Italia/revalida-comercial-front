import { apiRequest } from "@/lib/http";
import type { UserSearchResult } from "@/services/usersApi";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

interface ListWrapper<T> {
  data?: T[];
}

function unwrapArray<T>(payload: T[] | ListWrapper<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.data ?? [];
}

export interface CareerPlanOption {
  id: string;
  name: string;
  percentage?: number;
  commissionPercentage?: number;
  individualCommissionRate?: number;
}

export async function listCareerPlans(): Promise<CareerPlanOption[]> {
  const payload = await apiRequest<CareerPlanOption[] | ListWrapper<CareerPlanOption>>(CORE_API_URL, "/career-plans");
  return unwrapArray(payload);
}

export interface UpdateUserCareerPlanInput {
  careerPlanId: string;
  percentage: number;
  inTheCareerPlanSince?: string;
}

interface UpdateCareerPlanResponse {
  success?: boolean;
  data: {
    id: string;
    externalId: string;
    email?: string;
    name?: string;
    role?: UserSearchResult["role"];
    careerPlanId?: string | null;
    inTheCareerPlanSince?: string | null;
    careerPlan?: {
      id: string;
      name: string;
      individualCommissionRate?: string | number;
      commissionPercentage?: string | number;
    } | null;
  };
}

function toUserSearchResult(payload: UpdateCareerPlanResponse["data"]): UserSearchResult {
  const commissionRate = payload.careerPlan?.individualCommissionRate
    ?? payload.careerPlan?.commissionPercentage;

  return {
    id: payload.id,
    externalId: payload.externalId,
    email: payload.email ?? "",
    name: payload.name,
    role: payload.role,
    careerPlanId: payload.careerPlanId,
    inTheCareerPlanSince: payload.inTheCareerPlanSince,
    careerPlan: payload.careerPlan
      ? {
        id: payload.careerPlan.id,
        name: payload.careerPlan.name,
        individualCommissionRate: commissionRate,
      }
      : undefined,
  };
}

export async function updateUserCareerPlanById(
  userSub: string,
  input: UpdateUserCareerPlanInput,
): Promise<UserSearchResult> {
  const response = await apiRequest<UpdateCareerPlanResponse>(CORE_API_URL, `/users/${userSub}/career-plan`, {
    method: "PATCH",
    body: {
      careerPlanId: input.careerPlanId,
      percentage: input.percentage,
      ...(input.inTheCareerPlanSince ? { inTheCareerPlanSince: input.inTheCareerPlanSince } : {}),
    },
  });

  return toUserSearchResult(response.data);
}

export async function updateUserCareerPlan(
  userSub: string,
  careerLevel: string,
  commissionPct: number,
): Promise<void> {
  await apiRequest<void>(CORE_API_URL, `/users/${userSub}/career-plan`, {
    method: "PATCH",
    body: {
      level: careerLevel,
      commissionPercentage: commissionPct,
    },
  });
}
