import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, PlusCircle, FileText, Settings, LogOut, Building2, Shield } from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Nova Venda", icon: PlusCircle, path: "/nova-venda" },
  { label: "Minhas Vendas", icon: FileText, path: "/vendas" },
  { label: "Admin", icon: Shield, path: "/admin" },
];

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen gradient-primary flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <Building2 className="h-8 w-8 text-sidebar-primary-foreground" />
        <span className="text-lg font-display font-bold text-sidebar-foreground">
          Comercial
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
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
          onClick={() => navigate("/")}
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
