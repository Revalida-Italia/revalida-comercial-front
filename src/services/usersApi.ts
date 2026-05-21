import { apiRequest } from "@/lib/http";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

export type UserRole = "ADMIN" | "SELLER";

export interface CreateUserInput {
  email: string;
  role: UserRole;
  name?: string;
  careerPlanId?: string;
  temporaryPassword?: string;
}

export interface UserSearchResult {
  id: string;
  externalId: string;
  email: string;
  name?: string;
  careerPlan?: {
    id: string;
    name: string;
    individualCommissionRate?: string | number;
  };
}

interface ListWrapper<T> {
  data?: T[];
}

function unwrapArray<T>(payload: T[] | ListWrapper<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.data ?? [];
}

export async function searchUsers(searchTerm: string): Promise<UserSearchResult[]> {
  if (!searchTerm.trim()) {
    return [];
  }

  const payload = await apiRequest<UserSearchResult[] | ListWrapper<UserSearchResult>>(
    CORE_API_URL,
    `/users?searchTerm=${encodeURIComponent(searchTerm)}`,
  );

  return unwrapArray(payload);
}

export async function createUserByAdmin(input: CreateUserInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, "/users", {
    method: "POST",
    body: input,
  });
}
