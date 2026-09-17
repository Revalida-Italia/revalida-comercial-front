export type UserRole = "ADMIN" | "SELLER" | "FIXED_COSTS_MANAGER" | string;

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
}

export interface CareerPlan {
  id: string;
  name: string;
  individualCommissionRate: number;
  commissionPercentage?: number | string | null;
  teamCommissionRate: number | null;
  monthlyGoalSales: number | null;
  minimumMonthlySales: number | null;
  salesToNextCareerPlan: number | null;
  starsToLevelUp?: number | null;
  salesPerStar?: number | null;
}

export interface CareerProgress {
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
}

export interface UserProfile {
  id?: string;
  externalId?: string;
  sub: string;
  email?: string;
  name?: string;
  role: UserRole;
  roles: UserRole[];
  careerPlan?: CareerPlan;
  careerProgress?: CareerProgress;
  inTheCareerPlanSince?: string | null;
}

const SESSION_KEY = "sales-flow.session.v1";
const PROFILE_KEY = "sales-flow.profile.v1";
const AUTH_NOTICE_KEY = "sales-flow.auth.notice.v1";

export function getSession(): AuthSession | null {
  const value = window.localStorage.getItem(SESSION_KEY);
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as AuthSession;
    if (!parsed.accessToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(PROFILE_KEY);
}

export function setAuthNotice(message: string): void {
  window.localStorage.setItem(AUTH_NOTICE_KEY, message);
}

export function consumeAuthNotice(): string | null {
  const message = window.localStorage.getItem(AUTH_NOTICE_KEY);
  if (!message) {
    return null;
  }

  window.localStorage.removeItem(AUTH_NOTICE_KEY);
  return message;
}

export function getProfile(): UserProfile | null {
  const value = window.localStorage.getItem(PROFILE_KEY);
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as UserProfile;
    if (!parsed.sub || !parsed.role) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setProfile(profile: UserProfile): void {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function hasRole(role: UserRole): boolean {
  const profile = getProfile();
  if (!profile) {
    return false;
  }

  const target = String(role).toUpperCase();
  const primary = String(profile.role ?? "").toUpperCase();
  const roles = (profile.roles ?? []).map((item) => String(item).toUpperCase());

  return primary === target || roles.includes(target);
}

export function hasAnyRole(...roles: UserRole[]): boolean {
  return roles.some((role) => hasRole(role));
}

/** ADMIN ou FIXED_COSTS_MANAGER: custos fixos, margem e visão global de vendas. */
export function canViewFixedCosts(): boolean {
  return hasAnyRole("ADMIN", "FIXED_COSTS_MANAGER");
}

/** Alias da mesma regra de negócio (visão global de vendas / extras financeiros). */
export function canViewGlobalSalesExtras(): boolean {
  return canViewFixedCosts();
}

/** Marcar pagamento como pago/pendente no calendário e detalhe da venda. */
export function canManagePaymentStatus(): boolean {
  return canViewFixedCosts();
}
