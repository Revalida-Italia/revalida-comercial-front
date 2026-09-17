import { apiRequest } from "@/lib/http";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

export type UserRole = "ADMIN" | "SELLER" | "FIXED_COSTS_MANAGER";

export interface SystemRoleOption {
  value: UserRole;
  label: string;
  hint: string;
  allowsCareerPlan: boolean;
}

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
  role?: UserRole;
  createdAt?: string;
  updatedAt?: string;
  careerPlanId?: string | null;
  inTheCareerPlanSince?: string | null;
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

export async function listSystemRoles(): Promise<SystemRoleOption[]> {
  const payload = await apiRequest<SystemRoleOption[] | ListWrapper<SystemRoleOption>>(
    CORE_API_URL,
    "/users/roles",
  );

  return unwrapArray(payload);
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

export async function listUsers(): Promise<UserSearchResult[]> {
  const payload = await apiRequest<UserSearchResult[] | ListWrapper<UserSearchResult>>(CORE_API_URL, "/users");
  return unwrapArray(payload);
}

export async function createUserByAdmin(input: CreateUserInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, "/users", {
    method: "POST",
    body: input,
  });
}

export async function deleteProfile(sub: string): Promise<void> {
  await apiRequest<{ success: boolean; data: { deleted: boolean } }>(
    CORE_API_URL,
    `/users/${encodeURIComponent(sub)}/profile`,
    { method: "DELETE" },
  );
}

export function roleDisplayLabel(role?: string): string {
  switch (role) {
    case "ADMIN":
      return "Administrador";
    case "SELLER":
      return "Vendedor";
    case "FIXED_COSTS_MANAGER":
      return "Gestor de custos";
    default:
      return role ?? "Não definido";
  }
}

export function homePathForRole(role?: string): string {
  if (role === "ADMIN") {
    return "/admin";
  }

  if (role === "FIXED_COSTS_MANAGER") {
    return "/dashboard";
  }

  return "/dashboard";
}

/** Admin ou gestor de custos: visão global de vendas (somente leitura para o gestor). */
export function canViewAllSales(role?: string): boolean {
  const normalized = String(role ?? "").toUpperCase();
  return normalized === "ADMIN" || normalized === "FIXED_COSTS_MANAGER";
}

/** Mesma regra: custos fixos, margem líquida e calendário de custos. */
export function canViewFixedCosts(role?: string): boolean {
  return canViewAllSales(role);
}

/** Mesma regra: alterar status de pagamento. */
export function canManagePaymentStatus(role?: string): boolean {
  return canViewAllSales(role);
}

/** Pode criar/editar/arquivar/excluir vendas. */
export function canMutateSales(role?: string): boolean {
  const normalized = String(role ?? "").toUpperCase();
  return normalized === "ADMIN" || normalized === "SELLER";
}
