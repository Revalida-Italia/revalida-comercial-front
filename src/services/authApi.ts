import { apiRequest } from "@/lib/http";
import type { AuthSession, CareerPlan, UserProfile, UserRole } from "@/lib/session";
import { normalizeCommissionRate } from "@/services/commissionApi";

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL as string;
const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

interface LoginResponse {
  requiresChallenge?: boolean;
  challengeName?: string;
  session?: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  user?: {
    id?: string;
    email?: string;
    role?: UserRole;
  };
}

interface ResolveProfileResponse {
  data: {
    id: string;
    externalId: string;
    email: string;
    role: UserRole;
    name: string;
    careerPlanId: string;
    inTheCareerPlanSince?: string | null;
    careerPlan: {
      id: string;
      name: string;
      individualCommissionRate: number | string | null;
      commissionPercentage?: number | string | null;
      teamCommissionRate: number | null;
      monthlyGoalSales: number | null;
      minimumMonthlySales: number | null;
      starsToLevelUp?: number | null;
      salesPerStar?: number | null;
      salesToNextCareerPlan: number | null;
      createdAt: string;
      updatedAt: string;
    },
    careerProgress?: {
      stars: number;
      salesToNextStart?: number;
      salesToNextStar?: number;
      starsToLevelUp: number;
      monthlyGoal: {
        minimumMonthlyGoal: {
          minimumGoal: number;
          salesThisMonth: number;
        };
        monthlyGoal: {
          generalGoal: number;
          salesThisMonth: number;
        };
      };
    };
    createdAt: string;
    updatedAt: string;
  },
  success: boolean;
}

export interface LoginResult {
  kind: "authenticated";
  session: AuthSession;
  userId: string;
  email?: string;
  role?: UserRole;
}

export interface LoginChallengeResult {
  kind: "challenge";
  challengeName: "NEW_PASSWORD_REQUIRED";
  session: string;
  email: string;
}

export type LoginResultOrChallenge = LoginResult | LoginChallengeResult;

function normalizeRole(role?: UserRole): UserRole | undefined {
  if (!role) {
    return undefined;
  }

  return role.toUpperCase();
}

export async function login(email: string, password: string): Promise<LoginResultOrChallenge> {
  const payload = await apiRequest<LoginResponse>(AUTH_API_URL, "/auth/login", {
    method: "POST",
    body: { email, password, provider: "cognito" },
  });

  if (payload.requiresChallenge && payload.challengeName === "NEW_PASSWORD_REQUIRED") {
    if (!payload.session || !payload.email) {
      throw new Error("Resposta de challenge incompleta.");
    }

    return {
      kind: "challenge",
      challengeName: "NEW_PASSWORD_REQUIRED",
      session: payload.session,
      email: payload.email,
    };
  }

  const accessToken = payload.accessToken ?? payload.token;
  const userId = payload.user?.id;

  if (!accessToken) {
    throw new Error("Resposta de login sem access token.");
  }

  if (!userId) {
    throw new Error("Resposta de login sem user.id.");
  }

  return {
    kind: "authenticated",
    session: {
      accessToken,
      refreshToken: payload.refreshToken,
    },
    userId,
    email: payload.user?.email,
    role: normalizeRole(payload.user?.role),
  };
}

export async function completeNewPasswordChallenge(input: {
  email: string;
  session: string;
  newPassword: string;
}): Promise<void> {
  await apiRequest<void>(AUTH_API_URL, "/auth/cognito/challenge", {
    method: "POST",
    body: input,
  });
}

type AuthMessageResponse = {
  message?: string;
};

type AuthApiErrorBody = {
  statusCode?: number;
  code?: string;
  message?: string;
};

export class AuthApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
  }
}

async function postPublicAuth<T>(path: string, body: unknown): Promise<T> {
  if (!AUTH_API_URL) {
    throw new Error("VITE_AUTH_API_URL nao configurada.");
  }

  const base = AUTH_API_URL.endsWith("/") ? AUTH_API_URL.slice(0, -1) : AUTH_API_URL;
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;
    let code: string | undefined;

    try {
      const payload = (await response.json()) as AuthApiErrorBody;
      code = payload.code;
      message = payload.message ?? payload.code ?? message;
    } catch {
      // keep default message
    }

    throw new AuthApiError(response.status, message, code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** POST /auth/forgot-password — resposta opaca (sempre sucesso se o e-mail for válido). */
export async function requestPasswordReset(email: string): Promise<AuthMessageResponse> {
  return postPublicAuth<AuthMessageResponse>("/auth/forgot-password", {
    email: email.trim().toLowerCase(),
  });
}

/** POST /auth/reset-password — confirma código (Cognito ou legacy via auth-api). */
export async function confirmPasswordReset(input: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<AuthMessageResponse> {
  return postPublicAuth<AuthMessageResponse>("/auth/reset-password", {
    email: input.email.trim().toLowerCase(),
    code: input.code.trim(),
    newPassword: input.newPassword,
  });
}

export function getPasswordResetErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Nao foi possivel concluir. Tente novamente.";
  }

  const status = error instanceof AuthApiError ? error.status : undefined;
  const code = error instanceof AuthApiError ? error.code : undefined;

  if (status === 429 || code === "RATE_LIMITED") {
    return "Muitas tentativas. Tente novamente em alguns minutos.";
  }

  if (status === 503 || code === "PROVIDER_UNAVAILABLE") {
    return "Nao foi possivel concluir. Tente mais tarde.";
  }

  if (code === "INVALID_RESET_CODE") {
    return "Codigo invalido ou expirado. Solicite um novo codigo.";
  }

  if (status === 400 || code === "INVALID_REQUEST") {
    return "Dados invalidos. Verifique o e-mail, o codigo e a senha (minimo 8 caracteres).";
  }

  return "Nao foi possivel concluir. Tente novamente.";
}

const PASSWORD_RESET_EMAIL_KEY = "sales-flow.password-reset.email.v1";

export function persistResetEmail(email: string) {
  try {
    sessionStorage.setItem(PASSWORD_RESET_EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    // ignore storage failures
  }
}

export function readPersistedResetEmail(): string {
  try {
    return sessionStorage.getItem(PASSWORD_RESET_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearPersistedResetEmail() {
  try {
    sessionStorage.removeItem(PASSWORD_RESET_EMAIL_KEY);
  } catch {
    // ignore
  }
}

interface ResolveProfileFallback {
  email?: string;
  role?: UserRole;
}

interface UpsertProfilePayload {
  id: string;
  externalId: string;
  email: string;
  role: UserRole;
  name: string;
  careerPlanId: string;
  inTheCareerPlanSince?: string | null;
  careerPlan: {
    id: string;
    name: string;
    individualCommissionRate: number | string | null;
    commissionPercentage?: number | string | null;
    teamCommissionRate: number | null;
    monthlyGoalSales: number | null;
    minimumMonthlySales: number | null;
    starsToLevelUp?: number | null;
    salesPerStar?: number | null;
    salesToNextCareerPlan: number | null;
    createdAt: string;
    updatedAt: string;
  };
  careerProgress?: {
    stars: number;
    salesToNextStart?: number;
    salesToNextStar?: number;
    starsToLevelUp: number;
    monthlyGoal: {
      minimumMonthlyGoal: {
        minimumGoal: number;
        salesThisMonth: number;
      };
      monthlyGoal: {
        generalGoal: number;
        salesThisMonth: number;
      };
    };
  };
}

function toUserProfile(payload: UpsertProfilePayload, userId: string, fallback?: ResolveProfileFallback): UserProfile {
  const normalizedCareerPlan: CareerPlan | undefined = payload.careerPlan
    ? {
      ...payload.careerPlan,
      individualCommissionRate: normalizeCommissionRate(
        payload.careerPlan.individualCommissionRate ?? payload.careerPlan.commissionPercentage,
      ),
    }
    : undefined;

  const sub = payload.externalId || userId;
  const role = normalizeRole(payload.role ?? fallback?.role);

  if (!sub) {
    throw new Error("Perfil retornado sem sub/externalId.");
  }

  if (!role) {
    throw new Error("Perfil retornado sem role/grupo.");
  }

  return {
    id: payload.id,
    externalId: payload.externalId,
    sub,
    email: payload.email ?? fallback?.email,
    name: payload.name,
    role,
    roles: [role],
    careerPlan: normalizedCareerPlan,
    careerProgress: payload.careerProgress,
    inTheCareerPlanSince: payload.inTheCareerPlanSince ?? null,
  };
}

export async function resolveProfile(userId: string, fallback?: ResolveProfileFallback): Promise<UserProfile> {
  const { data: payload } = await apiRequest<ResolveProfileResponse>(CORE_API_URL, "/users/profile", {
    method: "POST",
    body: {
      id: userId,
      sub: userId,
      externalId: userId,
    },
  });

  return toUserProfile(payload, userId, fallback);
}

export async function updateProfileName(input: {
  userId: string;
  name: string;
  fallback?: ResolveProfileFallback;
}): Promise<UserProfile> {
  const trimmedName = input.name.trim();

  if (!trimmedName) {
    throw new Error("Nome nao pode ser vazio.");
  }

  const { data: payload } = await apiRequest<ResolveProfileResponse>(CORE_API_URL, "/users/profile", {
    method: "POST",
    body: {
      id: input.userId,
      sub: input.userId,
      externalId: input.userId,
      name: trimmedName,
    },
  });

  return toUserProfile(payload, input.userId, input.fallback);
}
