import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { SaleRecord, SalesSummary } from "@/services/commercialApi";
import type { DisplayCurrency } from "@/services/exchangeRatesApi";
import NetReceivedMonthAuditDialog from "@/features/sales/organisms/NetReceivedMonthAuditDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/shared/utils/format";
import { toNumberOrZero } from "@/shared/utils/number";
import { cn } from "@/lib/utils";
import {
  Banknote,
  Calculator,
  CircleDollarSign,
  HandCoins,
  Info,
  PieChart,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";

type SalesSummaryCardsProps = {
  summary: SalesSummary;
  sales?: SaleRecord[];
  /** ADMIN ou FIXED_COSTS_MANAGER: mostra custos fixos e margem. */
  canViewFixedCosts?: boolean;
  displayCurrency?: DisplayCurrency;
};

type MetricCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  valueClass?: string;
  iconWrapClass?: string;
  details?: ReactNode;
  tooltip?: string;
  onClick?: () => void;
  clickableHint?: string;
};

const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);

const MetricCard = ({
  label,
  value,
  icon: Icon,
  valueClass,
  iconWrapClass,
  details,
  tooltip,
  onClick,
  clickableHint,
}: MetricCardProps) => (
  <Card
    className={cn(
      "border-border/70",
      onClick && "cursor-pointer transition-all hover:border-sky-500/40 hover:shadow-sm",
    )}
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }
        : undefined
    }
  >
    <CardContent className="p-2.5">
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-[11px] leading-none text-muted-foreground">{label}</p>
            {tooltip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex shrink-0 rounded-sm text-muted-foreground/80 transition-colors hover:text-foreground"
                    aria-label={`Como calculamos ${label}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                  {tooltip}
                  {clickableHint ? ` ${clickableHint}` : ""}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          <p className={cn("mt-1 truncate text-sm font-semibold leading-tight tabular-nums text-foreground", valueClass)}>
            {value}
          </p>
          {details}
          {clickableHint ? (
            <p className="mt-1 text-[10px] leading-tight text-sky-700">{clickableHint}</p>
          ) : null}
        </div>
        <div className={cn("shrink-0 rounded-md p-1.5 bg-muted text-muted-foreground", iconWrapClass)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const SalesSummaryCards = ({
  summary,
  sales = [],
  canViewFixedCosts = false,
  displayCurrency = "BRL",
}: SalesSummaryCardsProps) => {
  const [auditOpen, setAuditOpen] = useState(false);
  const currency = summary.displayCurrency ?? displayCurrency;
  const totalAmount = toNumberOrZero(summary.totalAmount);
  const grossPayments = toNumberOrZero(summary.grossPaymentsThisMonth);
  const gatewayFees = toNumberOrZero(summary.totalGatewayFeesThisMonth);
  const netReceived = toNumberOrZero(summary.netReceivedThisMonth);
  const commission = toNumberOrZero(summary.comission ?? summary.commission);
  const commissionFuture = toNumberOrZero(summary.comissionFuture ?? summary.commissionFuture);
  const fixedCosts = toNumberOrZero(summary.totalFixedCostsThisMonth);
  const netMargin = summary.netMarginThisMonth != null
    ? toNumberOrZero(summary.netMarginThisMonth)
    : netReceived - fixedCosts;
  const netMarginPercent = summary.netMarginPercent != null
    ? summary.netMarginPercent
    : netReceived > 0
      ? (netMargin / netReceived) * 100
      : 0;
  const isNetMarginPositive = netMargin >= 0;

  const grossPaymentsTooltip = [
    "Soma dos valores brutos dos pagamentos elegíveis das vendas do mês.",
    "Inclui parcelamentos e pagamentos à vista. Assinaturas só entram quando já estão pagas.",
  ].join(" ");

  const netReceivedTooltip = [
    "Bruto do mês − taxas gateway − comissão do vendedor.",
    "Assinaturas entram somente quando já estão pagas.",
  ].join(" ");

  const netMarginTooltip = [
    "Recebido líquido do mês − custos fixos do mês.",
    "A margem percentual usa o recebido líquido como base (não o valor bruto do contrato).",
  ].join(" ");

  return (
    <>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCard
            label="Vendas"
            value={String(summary.totalSales ?? 0)}
            icon={ReceiptText}
            iconWrapClass="bg-primary/15 text-primary"
            tooltip="Quantidade de clientes nas vendas registradas no mês corrente (inclui arquivadas)."
          />

          <MetricCard
            label="Valor total do mês (Contratos)"
            value={formatCurrency(totalAmount, currency)}
            icon={Wallet}
            tooltip="Soma do valor de contrato das vendas feitas no mês corrente, antes de taxas e comissões."
          />

          <MetricCard
            label="Bruto do mês"
            value={formatCurrency(grossPayments, currency)}
            icon={Banknote}
            valueClass="text-violet-700"
            iconWrapClass="bg-violet-500/15 text-violet-700"
            tooltip={grossPaymentsTooltip}
            details={
              gatewayFees > 0 ? (
                <p className="mt-1 truncate text-[10px] leading-tight text-muted-foreground">
                  Excluindo assinaturas marcadas como pendentes
                </p>
              ) : null
            }
          />

          <MetricCard
            label="Recebido líquido do mês"
            value={formatCurrency(netReceived, currency)}
            icon={HandCoins}
            valueClass="text-sky-700"
            iconWrapClass="bg-sky-500/15 text-sky-700"
            tooltip={netReceivedTooltip}
            clickableHint="Clique para ver o extrato"
            onClick={() => setAuditOpen(true)}
            details={
              gatewayFees > 0 ? (
                <p className="mt-1 truncate text-[10px] leading-tight text-muted-foreground">
                  Taxas gateway: {formatCurrency(gatewayFees, currency)}
                </p>
              ) : null
            }
          />
        </div>

        <div className={cn("grid grid-cols-2 gap-2", canViewFixedCosts ? "sm:grid-cols-4" : "sm:grid-cols-2")}>
          <MetricCard
            label="Comissão desse mês"
            value={formatCurrency(commission, currency)}
            icon={TrendingUp}
            valueClass="text-primary"
            iconWrapClass="bg-primary/15 text-primary"
            tooltip="Comissão calculada sobre os pagamentos elegíveis das vendas do mês. Assinaturas só entram quando já estão pagas."
          />

          <MetricCard
            label="Comissão futura"
            value={formatCurrency(commissionFuture, currency)}
            icon={Calculator}
            valueClass="text-emerald-700"
            iconWrapClass="bg-emerald-500/15 text-emerald-700"
            tooltip="Comissão estimada de assinaturas ainda não pagas, com vencimento hoje ou no futuro, em vendas não arquivadas."
          />

          {canViewFixedCosts && (
            <>
              <MetricCard
                label="Custos fixos do mês"
                value={formatCurrency(fixedCosts, currency)}
                icon={CircleDollarSign}
                valueClass="text-amber-700"
                iconWrapClass="bg-amber-500/15 text-amber-700"
                tooltip="Total de custos fixos lançados no calendário de custos para o mês corrente."
              />

              <MetricCard
                label="Margem líquida do mês"
                value={formatCurrency(netMargin, currency)}
                icon={PieChart}
                valueClass={isNetMarginPositive ? "text-emerald-700" : "text-destructive"}
                iconWrapClass={
                  isNetMarginPositive ? "bg-emerald-500/15 text-emerald-700" : "bg-destructive/15 text-destructive"
                }
                tooltip={netMarginTooltip}
                details={
                  <div className="mt-1 space-y-0.5 text-[10px] leading-tight text-muted-foreground">
                    <p>{formatPercent(netMarginPercent)}% sobre o recebido líquido</p>
                    <p
                      className="truncate"
                      title={`Líquido ${formatCurrency(netReceived, currency)} · Comissão ${formatCurrency(commission, currency)} · Fixos ${formatCurrency(fixedCosts, currency)}`}
                    >
                      Líquido − fixos
                    </p>
                  </div>
                }
              />
            </>
          )}
        </div>
      </div>

      <NetReceivedMonthAuditDialog
        open={auditOpen}
        onOpenChange={setAuditOpen}
        sales={sales}
        summary={summary}
        displayCurrency={currency}
      />
    </>
  );
};

export default SalesSummaryCards;
