import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { SalesSummary } from "@/services/commercialApi";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/shared/utils/format";
import { toNumberOrZero } from "@/shared/utils/number";
import { cn } from "@/lib/utils";
import { Calculator, CircleDollarSign, PieChart, ReceiptText, TrendingUp, Wallet } from "lucide-react";

type SalesSummaryCardsProps = {
  summary: SalesSummary;
};

type MetricCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  valueClass?: string;
  iconWrapClass?: string;
  details?: ReactNode;
};

const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);

const MetricCard = ({ label, value, icon: Icon, valueClass, iconWrapClass, details }: MetricCardProps) => (
  <Card className="border-border/70">
    <CardContent className="p-2.5">
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] leading-none text-muted-foreground">{label}</p>
          <p className={cn("mt-1 truncate text-sm font-semibold leading-tight tabular-nums text-foreground", valueClass)}>
            {value}
          </p>
          {details}
        </div>
        <div className={cn("shrink-0 rounded-md p-1.5 bg-muted text-muted-foreground", iconWrapClass)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const SalesSummaryCards = ({ summary }: SalesSummaryCardsProps) => {
  const totalAmount = toNumberOrZero(summary.totalAmount);
  const commission = toNumberOrZero(summary.comission ?? summary.commission);
  const commissionFuture = toNumberOrZero(summary.comissionFuture ?? summary.commissionFuture);
  const fixedCosts = toNumberOrZero(summary.totalFixedCostsThisMonth);
  const grossMargin = totalAmount - commission;
  const netMargin = totalAmount - commission - fixedCosts;
  const grossMarginPercent = totalAmount > 0 ? (grossMargin / totalAmount) * 100 : 0;
  const netMarginPercent = totalAmount > 0 ? (netMargin / totalAmount) * 100 : 0;
  const isNetMarginPositive = netMargin >= 0;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <MetricCard
        label="Vendas"
        value={String(summary.totalSales ?? 0)}
        icon={ReceiptText}
        iconWrapClass="bg-primary/15 text-primary"
      />

      <MetricCard label="Valor total" value={formatCurrency(totalAmount, "BRL")} icon={Wallet} />

      <MetricCard
        label="Comissao desse mês"
        value={formatCurrency(commission, "BRL")}
        icon={TrendingUp}
        valueClass="text-primary"
        iconWrapClass="bg-primary/15 text-primary"
      />

      <MetricCard
        label="Comissao futura"
        value={formatCurrency(commissionFuture, "BRL")}
        icon={Calculator}
        valueClass="text-emerald-700"
        iconWrapClass="bg-emerald-500/15 text-emerald-700"
      />

      <MetricCard
        label="Custos fixos do mês"
        value={formatCurrency(fixedCosts, "BRL")}
        icon={CircleDollarSign}
        valueClass="text-amber-700"
        iconWrapClass="bg-amber-500/15 text-amber-700"
      />

      <MetricCard
        label="Margem"
        value={formatCurrency(netMargin, "BRL")}
        icon={PieChart}
        valueClass={isNetMarginPositive ? "text-emerald-700" : "text-destructive"}
        iconWrapClass={
          isNetMarginPositive ? "bg-emerald-500/15 text-emerald-700" : "bg-destructive/15 text-destructive"
        }
        details={
          <div className="mt-1 space-y-0.5 text-[10px] leading-tight text-muted-foreground">
            <p>
              {formatPercent(netMarginPercent)}% líquida · {formatPercent(grossMarginPercent)}% bruta
            </p>
            <p
              className="truncate"
              title={`Comissão ${formatCurrency(commission, "BRL")} · Fixos ${formatCurrency(fixedCosts, "BRL")}`}
            >
            </p>
          </div>
        }
      />
    </div>
  );
};

export default SalesSummaryCards;
