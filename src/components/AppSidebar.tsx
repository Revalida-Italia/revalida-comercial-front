import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { LayoutDashboard, PlusCircle, FileText, LogOut, Building2, Shield, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { clearSession, getProfile, hasRole } from "@/lib/session";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Nova Venda", icon: PlusCircle, path: "/nova-venda" },
  { label: "Minhas Vendas", icon: FileText, path: "/vendas" },
  {
    label: "Admin",
    icon: Shield,
    path: "/admin",
    subItems: [
      { label: "Dashboard", path: "/admin" },
      { label: "Associar Usuário", path: "/admin/carreira" },
      { label: "Editar Taxas", path: "/admin/payment-gateways" },
    ],
  },
];

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = getProfile();
  const isAdmin = hasRole("ADMIN");
  const [expandedAdmin, setExpandedAdmin] = useState(false);

  const visibleItems = navItems.filter((item) => (item.path === "/admin" ? isAdmin : true));

  const logout = () => {
    clearSession();
    navigate("/");
  };

  const roleLabel = profile?.role === "ADMIN" ? "Admin" : "Vendedor";

  const isAdminPath = location.pathname.startsWith("/admin");

  return (
    <aside className="w-64 min-h-screen gradient-primary flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <Building2 className="h-8 w-8 text-sidebar-primary-foreground" />
        <span className="text-lg font-display font-bold text-sidebar-foreground">
          Comercial
        </span>
      </div>

      <div className="mx-3 mb-3 rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-3 text-sidebar-foreground">
        <p className="truncate text-sm font-semibold">{profile?.name || "Usuario"}</p>
        <p className="truncate text-xs text-sidebar-foreground/70">{profile?.email || "email nao informado"}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">{roleLabel}</Badge>
          <Badge variant="outline" className="text-[10px] border-sidebar-border text-sidebar-foreground/80">
            {profile?.careerPlan?.name || "Sem career plan"}
          </Badge>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
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

      <div className="p-3 border-t border-sidebar-border">
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
