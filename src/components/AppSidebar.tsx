import { Badge } from "@/components/ui/badge";
import { clearSession, getProfile, hasRole, setProfile } from "@/lib/session";
import { resolveProfile } from "@/services/authApi";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, ChevronDown, FileText, LayoutDashboard, LogOut, MessageSquare, PlusCircle, Shield, Star, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Nova Venda", icon: PlusCircle, path: "/nova-venda" },
  { label: "Vendas", icon: FileText, path: "/vendas" },
  { label: "Templates", icon: MessageSquare, path: "/templates" },
  {
    label: "Admin",
    icon: Shield,
    path: "/admin",
    subItems: [
      { label: "Dashboard", path: "/admin" },
      { label: "Usuarios", path: "/admin/users" },
      { label: "Editar Taxas", path: "/admin/payment-gateways" },
      { label: "Produtos", path: "/admin/products" },
    ],
  },
];

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const cachedProfile = getProfile();
  const isAdmin = hasRole("ADMIN");
  const [expandedAdmin, setExpandedAdmin] = useState(false);
  const profileQuery = useQuery({
    queryKey: ["profile", cachedProfile?.sub, location.pathname],
    queryFn: () => resolveProfile(cachedProfile?.sub ?? "", {
      email: cachedProfile?.email,
      role: cachedProfile?.role,
    }),
    enabled: Boolean(cachedProfile?.sub),
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });

  const profile = profileQuery.data ?? cachedProfile;

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  const visibleItems = navItems.filter((item) => (item.path === "/admin" ? isAdmin : true));

  const logout = () => {
    clearSession();
    navigate("/");
  };

  const roleLabel = profile?.role === "ADMIN" ? "Admin" : "Vendedor";
  const careerPlanName = profile?.careerPlan?.name || "Sem career plan";
  const currentStars = profile?.careerProgress?.stars ?? 0;
  const salesToNextStar = profile?.careerProgress?.salesToNextStart ?? profile?.careerProgress?.salesToNextStar;
  const starsToLevelUp = profile?.careerProgress?.starsToLevelUp ?? profile?.careerPlan?.starsToLevelUp ?? 0;
  const minimumMonthlyGoal = profile?.careerProgress?.monthlyGoal?.minimumMonthlyGoal?.minimumGoal ?? 0;
  const minimumMonthlySales = profile?.careerProgress?.monthlyGoal?.minimumMonthlyGoal?.salesThisMonth ?? 0;
  const generalMonthlyGoal = profile?.careerProgress?.monthlyGoal?.monthlyGoal?.generalGoal ?? 0;
  const generalMonthlySales = profile?.careerProgress?.monthlyGoal?.monthlyGoal?.salesThisMonth ?? 0;
  const hasReachedMinimumMonthlyGoal = minimumMonthlyGoal > 0 && minimumMonthlySales >= minimumMonthlyGoal;

  const starSlots = useMemo(() => {
    const totalSlots = Math.max(starsToLevelUp, 1);
    return Array.from({ length: totalSlots }, (_, index) => index < currentStars);
  }, [currentStars, starsToLevelUp]);

  const progressPercentage = starsToLevelUp > 0 ? Math.min((currentStars / starsToLevelUp) * 100, 100) : 0;

  const isAdminPath = location.pathname.startsWith("/admin");

  return (
    <aside className="sticky top-0 flex h-[100dvh] w-64 shrink-0 flex-col overflow-hidden gradient-primary">
      <div className="flex shrink-0 items-center gap-3 p-6">
        <Building2 className="h-8 w-8 text-sidebar-primary-foreground" />
        <span className="font-display text-lg font-bold text-sidebar-foreground">
          Comercial
        </span>
      </div>

      <div className="mx-3 mb-4 shrink-0 rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/50 p-4 text-sidebar-foreground shadow-inner shadow-black/10 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile?.name || "Usuário"}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">{profile?.email || "email não informado"}</p>
          </div>
          <div className="rounded-full bg-sidebar-primary/15 p-2 text-sidebar-primary">
            <User className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="border-transparent bg-sidebar-foreground text-[10px] text-slate-950">
            {roleLabel}
          </Badge>
          <Badge variant="outline" className="border-sidebar-border text-[10px] text-sidebar-foreground/85">
            {careerPlanName}
          </Badge>
        </div>
      </div>

      <div className="mx-3 mb-3 shrink-0">
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sidebar-foreground shadow-sm shadow-black/10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-100/90">
              <Star className="h-4 w-4 text-amber-300" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">Progresso da carreira</p>
            </div>
            <p className="text-[11px] text-sidebar-foreground/65">
              {currentStars}/{starsToLevelUp || "?"} estrelas
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {starSlots.map((filled, index) => (
              <div
                key={index}
                className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                  filled
                    ? "border-amber-300/70 bg-amber-300/20 text-amber-300"
                    : "border-white/10 bg-white/5 text-sidebar-foreground/25"
                }`}
              >
                <Star className={`h-4 w-4 ${filled ? "fill-current" : ""}`} />
              </div>
            ))}
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-cyan-300 transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-sidebar-foreground/75">
            <span>
              Prox. estrela em <span className="font-semibold text-sidebar-foreground">{salesToNextStar ?? "-"}</span>{" "}
              venda{salesToNextStar === 1 ? "" : "s"}
            </span>
            <span>{progressPercentage.toFixed(0)}%</span>
          </div>

          <hr className="my-2 border-sidebar-border/80" />

          <div className="mt-2 flex flex-col gap-2 text-[11px] text-sidebar-foreground/65">
            {hasReachedMinimumMonthlyGoal ? (
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Check className="h-3.5 w-3.5" />
                Meta mínima do mês <span className="font-semibold text-emerald-200">{minimumMonthlySales}/{minimumMonthlyGoal}</span>
              </span>
            ) : (
              <span>
                Meta mínima do mês <span className="font-semibold text-sidebar-foreground/90">{minimumMonthlySales}/{minimumMonthlyGoal}</span>
              </span>
            )}
            <span>
              Meta do mês <span className="font-semibold text-sidebar-foreground/90">{generalMonthlySales}/{generalMonthlyGoal}</span>
            </span>
          </div>
        </div>

        {/* metas removidas do sidebar */}
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedAdmin && item.path === "/admin";

          if (hasSubItems) {
            return (
              <div key={item.path}>
                <button
                  onClick={() => {
                    if (hasSubItems) {
                      setExpandedAdmin(!expandedAdmin);
                    } else {
                      navigate(item.path);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isAdminPath
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                  {hasSubItems && (
                    <ChevronDown
                      className={`h-4 w-4 ml-auto transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-6 space-y-1 mt-1">
                    {item.subItems?.map((subItem) => {
                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <button
                          key={subItem.path}
                          onClick={() => navigate(subItem.path)}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                            isSubActive
                              ? "bg-sidebar-accent/60 text-sidebar-foreground"
                              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                          }`}
                        >
                          {subItem.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
