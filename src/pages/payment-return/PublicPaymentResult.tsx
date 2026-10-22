import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PublicPaymentResultProps = {
  title: string;
  tone: "success" | "neutral";
  icon: ReactNode;
  children?: ReactNode;
};

const PublicPaymentResult = ({ title, tone, icon, children }: PublicPaymentResultProps) => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-25 gradient-primary" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

      <Card className="relative w-full max-w-md border-border/70 bg-card/95 shadow-2xl backdrop-blur-sm">
        <CardHeader className="items-center space-y-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Building2 className="h-3.5 w-3.5" />
            Portal Revalida
          </div>
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full",
              tone === "success" ? "bg-success/15 text-success" : "bg-muted text-foreground",
            )}
          >
            {icon}
          </div>
          <h1 className="text-2xl font-semibold leading-snug tracking-tight text-foreground">{title}</h1>
        </CardHeader>
        {children ? <CardContent className="space-y-4 text-center">{children}</CardContent> : null}
        <p className="px-6 pb-6 text-center text-xs text-muted-foreground">Sistema Comercial</p>
      </Card>
    </div>
  );
};

export default PublicPaymentResult;
