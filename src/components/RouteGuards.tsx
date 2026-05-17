import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getSession, hasRole } from "@/lib/session";

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
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
