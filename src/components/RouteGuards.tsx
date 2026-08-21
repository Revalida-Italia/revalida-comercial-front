import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  canManagePaymentStatus,
  canViewFixedCosts,
  getSession,
  hasAnyRole,
  hasRole,
  getProfile,
} from "@/lib/session";
import { homePathForRole } from "@/services/usersApi";

export const RequireAuth = () => {
  const location = useLocation();
  const session = getSession();

  if (!session?.accessToken) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export const RequireAdmin = () => {
  if (!hasRole("ADMIN")) {
    const profile = getProfile();
    return <Navigate to={homePathForRole(profile?.role)} replace />;
  }

  return <Outlet />;
};

export const RequireCostsCalendarAccess = () => {
  if (canViewFixedCosts()) {
    return <Outlet />;
  }

  const profile = getProfile();
  return <Navigate to={homePathForRole(profile?.role)} replace />;
};

/** Calendário de cobranças: admin e gestor de custos. */
export const RequireBillingCalendarAccess = () => {
  if (canManagePaymentStatus()) {
    return <Outlet />;
  }

  const profile = getProfile();
  return <Navigate to={homePathForRole(profile?.role)} replace />;
};

/** Dashboard + detalhe de vendas: seller, admin e gestor de custos. */
export const RequireSalesViewAccess = () => {
  if (hasAnyRole("ADMIN", "SELLER", "FIXED_COSTS_MANAGER")) {
    return <Outlet />;
  }

  const profile = getProfile();
  return <Navigate to={homePathForRole(profile?.role)} replace />;
};

/** Criar/editar vendas e templates: admin e vendedor. */
export const RequireSalesMutationAccess = () => {
  if (!hasAnyRole("ADMIN", "SELLER")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

/** @deprecated Prefer RequireSalesViewAccess / RequireSalesMutationAccess */
export const RequireCommercialAccess = () => {
  if (!hasAnyRole("ADMIN", "SELLER")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
