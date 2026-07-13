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
