import type { CommissionBreakdownResult } from "@/lib/commission";
import { Separator } from "@/components/ui/separator";
import {
  Award,
  Banknote,
  CreditCard,
  Landmark,
  MinusCircle,
  Package,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import { PAYMENT_TYPE_LABELS } from "../constants";
import type { ConfiguredSalePayment, FilledSaleCustomer, SalePaymentDraft, SaleSummaryItem } from "../types";

type SaleSummaryProps = {
  filledCustomers: FilledSaleCustomer[];
  saleItems: SaleSummaryItem[];
  configuredPayments: ConfiguredSalePayment[];
  commissionBreakdown: CommissionBreakdownResult;
  estimatedCommission: number;
  currency: string;
  careerPlanName?: string;
  showCommissionRateWarning?: boolean;
  getFeeRate: (gateway: string, paymentType: string) => number;
  paymentGrossValue: (payment: SalePaymentDraft) => number;
  subscriptionMonthLabelMode?: "long" | "compact";
};

function getSubscriptionMonthLabel(
  baseDueDate: string | undefined,
  monthIndex: number,
  mode: "long" | "compact",
): string {
  if (!baseDueDate) {
    return `Mes ${monthIndex}`;
  }

  const baseDate = new Date(`${baseDueDate}T00:00:00`);
  if (Number.isNaN(baseDate.getTime())) {
    return `Mes ${monthIndex}`;
  }

  const targetDate = new Date(baseDate);
  targetDate.setMonth(targetDate.getMonth() + (monthIndex - 1));

  if (mode === "compact") {
    return targetDate.toLocaleDateString("pt-BR", { month: "2-digit", year: "2-digit" });
  }

  return targetDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

const SaleSummary = ({
  filledCustomers,
  saleItems,
  configuredPayments,
  commissionBreakdown,
  estimatedCommission,
  currency,
  careerPlanName,
  showCommissionRateWarning = false,
  getFeeRate,
  paymentGrossValue,
  subscriptionMonthLabelMode = "long",
}: SaleSummaryProps) => (
  <div className="space-y-4 text-sm">
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <User className="h-3.5 w-3.5" />
        Clientes
      </div>
      {filledCustomers.length === 0 ? (
        <p className="italic text-muted-foreground">Nenhum cliente adicionado</p>
      ) : (
        <ul className="space-y-1">
          {filledCustomers.map((customer, index) => (
            <li key={index}>
              <p className="font-medium leading-tight">{customer.name}</p>
              {customer.document && <p className="text-xs text-muted-foreground">{customer.document}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>

    <Separator />

    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Package className="h-3.5 w-3.5" />
        Produtos
      </div>
      {saleItems.length > 0 ? (
        <ul className="space-y-1.5">
          {saleItems.map((item, index) => (
            <li key={`${item.productName}-${item.releaseDate}-${index}`}>
              <p className="font-medium leading-tight">{item.productName}</p>
              {item.releaseDate && <p className="text-xs text-muted-foreground">Liberacao: {item.releaseDate}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="italic text-muted-foreground">Nao selecionado</p>
      )}
    </div>

    <Separator />

    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <CreditCard className="h-3.5 w-3.5" />
        Pagamentos
      </div>
      {configuredPayments.length === 0 ? (
        <p className="italic text-muted-foreground">Nenhum pagamento configurado</p>
      ) : (
        <ul className="space-y-2">
          {configuredPayments.map((payment, index) => (
            <li key={index} className="rounded-md border p-2">
              <p className="font-medium">{payment.gateway}</p>
              <p className="text-muted-foreground">
                {PAYMENT_TYPE_LABELS[payment.paymentType] ?? payment.paymentType}
                {(() => {
                  const feeRate = getFeeRate(payment.gateway, payment.paymentType);
                  return feeRate > 0 ? ` - taxa ${feeRate}%` : "";
                })()}
              </p>
              <p className="font-medium">
                {paymentGrossValue({
                  gateway: payment.gateway,
                  paymentType: payment.paymentType,
                  amount: String(payment.amount),
                  totalInstallments: String(payment.totalInstallments ?? 1),
                  dueDate: payment.dueDate ?? "",
                }).toLocaleString("pt-BR", { style: "currency", currency })}
              </p>
              {payment.dueDate && <p className="text-xs text-muted-foreground">Pagamento: {payment.dueDate}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>

    <Separator />

    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" />
        Comissao estimada
      </div>
      {configuredPayments.length > 0 ? (
        <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="text-xl font-bold text-primary">
            {estimatedCommission.toLocaleString("pt-BR", { style: "currency", currency })}
          </p>

          <div className="space-y-0.5">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Award className="h-3 w-3" />
              {careerPlanName ?? "Nao carregado"} · {commissionBreakdown.commissionRate}%
            </p>
            {showCommissionRateWarning && commissionBreakdown.commissionRate === 0 && (
              <p className="text-xs text-amber-700">
                Taxa nao encontrada; recarregue o login.
              </p>
            )}
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Banknote className="h-3 w-3" />
              Bruto total: {commissionBreakdown.totalGross.toLocaleString("pt-BR", { style: "currency", currency })}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Landmark className="h-3 w-3" />
              Taxas gateway: {commissionBreakdown.totalFees.toLocaleString("pt-BR", { style: "currency", currency })}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3" />
              Liquido: {commissionBreakdown.totalNet.toLocaleString("pt-BR", { style: "currency", currency })}
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {commissionBreakdown.payments.map((payment, idx) => (
              <div key={`${payment.gateway}-${payment.paymentType}-${idx}`} className="rounded-md border bg-background p-2 space-y-0.5">
                <p className="text-xs font-semibold text-foreground">
                  {payment.gateway} · {PAYMENT_TYPE_LABELS[payment.paymentType] ?? payment.paymentType}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><Banknote className="h-3 w-3" /> Bruto: {payment.grossAmount.toLocaleString("pt-BR", { style: "currency", currency })}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><MinusCircle className="h-3 w-3" /> Taxa ({payment.feeRate}%): {payment.feeAmount.toLocaleString("pt-BR", { style: "currency", currency })}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingDown className="h-3 w-3" /> Liquido: {payment.netAmount.toLocaleString("pt-BR", { style: "currency", currency })}</p>
                <p className="flex items-center gap-1 text-xs font-medium text-primary"><TrendingUp className="h-3 w-3" /> Comissao: {payment.commissionAmount.toLocaleString("pt-BR", { style: "currency", currency })}</p>

                {payment.paymentType === "SUBSCRIPTION" && payment.monthlyCommissions && (
                  <div className="mt-1.5 rounded border border-dashed p-1.5 space-y-1">
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                      <CreditCard className="h-3 w-3" /> {payment.monthlyCommissions.length} parcelas mensais
                    </p>
                    {payment.monthlyCommissions.slice(0, 24).map((month) => (
                      <div key={month.month} className="grid gap-0.5 text-[11px] text-muted-foreground md:grid-cols-[1fr_auto] md:items-center md:gap-2">
                        <span>{getSubscriptionMonthLabel(configuredPayments[idx]?.dueDate, month.month, subscriptionMonthLabelMode)}</span>
                        <span className="flex flex-wrap items-center gap-x-1.5 md:justify-end">
                          <span className="text-muted-foreground/70">bruto {month.grossAmount.toLocaleString("pt-BR", { style: "currency", currency })}</span>
                          <span className="font-medium text-foreground">→ {month.commissionAmount.toLocaleString("pt-BR", { style: "currency", currency })}</span>
                        </span>
                      </div>
                    ))}
                    {payment.monthlyCommissions.length > 24 && (
                      <p className="text-[11px] text-muted-foreground">... +{payment.monthlyCommissions.length - 24} meses</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="italic text-muted-foreground">Preencha os pagamentos para calcular</p>
      )}
    </div>
  </div>
);

export default SaleSummary;
