export type UserRole = "ADMIN" | "SELLER" | string;

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
}

export interface CareerPlan {
  id: string;
  name: string;
  individualCommissionRate: number;
  teamCommissionRate: number | null;
  monthlyGoalSales: number | null;
  minimumMonthlySales: number | null;
  salesToNextCareerPlan: number | null;
}

export interface UserProfile {
  sub: string;
  email?: string;
  name?: string;
  role: UserRole;
  roles: UserRole[];
  careerPlan?: CareerPlan;
}

const SESSION_KEY = "sales-flow.session.v1";
const PROFILE_KEY = "sales-flow.profile.v1";

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

  return profile.role === role || profile.roles.includes(role);
}
