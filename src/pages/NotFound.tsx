import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { AlertTriangle, Building2, Compass } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const hasSession = Boolean(getSession()?.accessToken);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-30 gradient-primary" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative w-full max-w-2xl rounded-3xl border border-border/70 bg-card/95 p-8 shadow-2xl backdrop-blur-sm md:p-10">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <Building2 className="h-3.5 w-3.5" />
          Sistema Comercial
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Erro de rota</p>
          <h1 className="text-5xl font-bold tracking-tight text-foreground md:text-6xl">404</h1>
          <div className="inline-flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-50/70 px-3 py-2 text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <span className="text-sm">A pagina que voce tentou acessar nao existe.</span>
          </div>
          <p className="max-w-xl text-muted-foreground">
            Rota atual: <span className="font-medium text-foreground">{location.pathname}</span>
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => navigate(hasSession ? "/dashboard" : "/", { replace: true })} className="gap-2">
            <Compass className="h-4 w-4" />
            {hasSession ? "Ir para Dashboard" : "Ir para Login"}
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Voltar pagina anterior
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
