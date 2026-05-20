import type { SalesSummary } from "@/lib/commercialApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/shared/utils/format";
import { toNumberOrZero } from "@/shared/utils/number";
import { Calculator, ReceiptText, TrendingUp, Wallet } from "lucide-react";

type SalesSummaryCardsProps = {
  summary: SalesSummary;
};

const SalesSummaryCards = ({ summary }: SalesSummaryCardsProps) => {
  const totalAmount = toNumberOrZero(summary.totalAmount);
  const commission = toNumberOrZero(summary.comission ?? summary.commission);
  const commissionFuture = toNumberOrZero(summary.comissionFuture ?? summary.commissionFuture);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><ReceiptText className="h-4 w-4" />Vendas</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <p className="text-2xl font-semibold tracking-tight">{summary.totalSales ?? 0}</p>
          <div className="rounded-lg bg-primary/15 p-2 text-primary">
            <ReceiptText className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4" />Valor total</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <p className="text-xl font-semibold tracking-tight">{formatCurrency(totalAmount, "BRL")}</p>
          <div className="rounded-lg bg-muted p-2 text-foreground">
            <Wallet className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" />Comissao desse mês</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xl font-semibold tracking-tight text-primary">{formatCurrency(commission, "BRL")}</p>
          </div>
          <div className="rounded-lg bg-primary/15 p-2 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Calculator className="h-4 w-4" />Comissao futura</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xl font-semibold tracking-tight text-emerald-700">{formatCurrency(commissionFuture, "BRL")}</p>
          </div>
          <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-700">
            <Calculator className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesSummaryCards;
