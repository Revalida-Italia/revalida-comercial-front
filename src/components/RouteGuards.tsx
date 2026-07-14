import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getSession, hasRole, getProfile } from "@/lib/session";
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
  if (hasRole("ADMIN") || hasRole("FIXED_COSTS_MANAGER")) {
    return <Outlet />;
  }

  const profile = getProfile();
  return <Navigate to={homePathForRole(profile?.role)} replace />;
};

export const RequireCommercialAccess = () => {
  if (hasRole("FIXED_COSTS_MANAGER") && !hasRole("ADMIN")) {
    return <Navigate to="/admin/costs-calendar" replace />;
  }

  return <Outlet />;
};
