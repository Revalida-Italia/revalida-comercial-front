import { apiRequest } from "@/lib/http";

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

export async function updateUserCareerPlanById(
  userSub: string,
  careerPlanId: string,
  percentage: number,
): Promise<void> {
  await apiRequest<void>(CORE_API_URL, `/users/${userSub}/career-plan`, {
    method: "PATCH",
    body: {
      careerPlanId,
      percentage,
    },
  });
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
