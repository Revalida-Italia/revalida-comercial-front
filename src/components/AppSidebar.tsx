import { Notranslate } from "@/components/Notranslate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCareerPlanStartDateLabel } from "@/features/admin-career-plan/careerPlanStartDate";
import { clearSession, getProfile, hasRole, setProfile } from "@/lib/session";
import { resolveProfile, updateProfileName } from "@/services/authApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronDown, LayoutDashboard, LogOut, MessageSquare, PenLine, PlusCircle, Shield, Star, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Nova Venda", icon: PlusCircle, path: "/nova-venda" },
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
      { label: "Calendario de Custos", path: "/admin/costs-calendar" },
    ],
  },
];

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const cachedProfile = getProfile();
  const isAdmin = hasRole("ADMIN");
  const [expandedAdmin, setExpandedAdmin] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");

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

  useEffect(() => {
    setDraftName(profile?.name ?? "");
    setIsEditingName(false);
  }, [profile?.name, profile?.sub]);

  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!profile?.sub) {
        throw new Error("Perfil não encontrado.");
      }

      return updateProfileName({
        userId: profile.sub,
        name,
        fallback: {
          email: profile.email,
          role: profile.role,
        },
      });
    },
    onSuccess: (updatedProfile) => {
      setProfile(updatedProfile);
      setIsEditingName(false);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Nome atualizado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar nome");
    },
  });

  const visibleItems = navItems.filter((item) => (item.path === "/admin" ? isAdmin : true));

  const logout = () => {
    clearSession();
    navigate("/");
  };

  const roleLabel = profile?.role === "ADMIN" ? "Admin" : "Vendedor";
  const careerPlanName = profile?.careerPlan?.name || "Sem plano de carreira";
  const hasCareerPlan = Boolean(profile?.careerPlan?.name);
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
    <aside
      className={cn(
        "sticky top-0 flex h-[100dvh] w-64 shrink-0 flex-col overflow-hidden gradient-primary",
        isAdmin && "gradient-primary-admin ring-1 ",
      )}
    >
      <div className="flex shrink-0 items-center gap-3 p-6">
        <Building2 className="h-8 w-8 text-sidebar-primary-foreground" />
        <div className="min-w-0">
          <span className="font-display text-lg font-bold text-sidebar-foreground">
            Comercial
          </span>
        </div>
      </div>

      <div
        className={cn(
          "mx-3 mb-4 shrink-0 rounded-2xl border p-4 text-sidebar-foreground shadow-inner shadow-black/10 backdrop-blur-sm",
          isAdmin
            ? "border-amber-300/35 bg-amber-400/10"
            : "border-sidebar-border/80 bg-sidebar-accent/50",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <div className="space-y-2">
                <Input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Nome"
                  className="h-8 border-sidebar-border/60 bg-sidebar-accent/40 text-sidebar-foreground placeholder:text-sidebar-foreground/50"
                  disabled={updateNameMutation.isPending}
                />
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 border-sidebar-border/60 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"
                    disabled={updateNameMutation.isPending}
                    onClick={() => {
                      setIsEditingName(false);
                      setDraftName(profile?.name ?? "");
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    className="h-7 w-7 bg-sidebar-foreground text-slate-950 hover:bg-sidebar-foreground/90"
                    disabled={updateNameMutation.isPending || !draftName.trim()}
                    onClick={() => updateNameMutation.mutate(draftName)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="truncate text-sm font-semibold">{profile?.name || "Usuário"}</p>
                <p className="truncate text-xs text-sidebar-foreground/70">{profile?.email || "email não informado"}</p>
              </>
            )}
          </div>
          {!isEditingName && (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="rounded-full bg-sidebar-primary/15 p-2 text-sidebar-primary transition-colors hover:bg-sidebar-primary/25"
              title="Editar nome"
            >
              <PenLine className="h-4 w-4" />
            </button>
          )}
          {isEditingName && (
            <div className="rounded-full bg-sidebar-primary/15 p-2 text-sidebar-primary">
              <User className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge
            variant="secondary"
            className={cn(
              "border-transparent text-[10px]",
              isAdmin
                ? "bg-amber-300 text-slate-950"
                : "bg-sidebar-foreground text-slate-950",
            )}
          >
            {roleLabel}
          </Badge>
          <Badge variant="outline" className="border-sidebar-border text-[10px] text-sidebar-foreground/85">
            <Notranslate>{careerPlanName}</Notranslate>
          </Badge>
        </div>

        {hasCareerPlan && (
          <p className="mt-2 text-[11px] text-sidebar-foreground/70">
            {careerPlanName} Desde{" "}
            <span className="font-medium text-sidebar-foreground/90">
              {formatCareerPlanStartDateLabel(profile?.inTheCareerPlanSince)}
            </span>
          </p>
        )}
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
