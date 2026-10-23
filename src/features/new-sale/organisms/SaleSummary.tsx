import type { CommissionBreakdownResult } from "@/services/commissionApi";
import { Notranslate } from "@/components/Notranslate";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Award,
  Banknote,
  CircleCheck,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Landmark,
  Loader2,
  MinusCircle,
  Package,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { BILLING_TYPE_LABELS, PAYMENT_TYPE_LABELS, SUBSCRIPTION_CYCLE_LABELS } from "../constants";
import type { ConfiguredSalePayment, FilledSaleCustomer, SaleSummaryItem } from "../types";
import EditableSection from "@/features/sales/organisms/EditableSection";
import { billingStatusLabel, normalizeBillingStatus } from "@/features/billing-calendar/utils";
import { Badge } from "@/components/ui/badge";
import { formatInstallmentLabel, getPaymentGrossValue } from "@/shared/utils/payment";
import { formatDate } from "@/shared/utils/format";

type PaymentValueLike = {
  amount: string | number;
  paymentType: string;
  totalInstallments?: string | number;
};

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
  paymentGrossValue: (payment: PaymentValueLike) => number;
  subscriptionMonthLabelMode?: "long" | "compact";
  saleId?: string;
  canManagePaymentStatus?: boolean;
  updatingPaymentId?: string | null;
  onMarkPaymentPaid?: (paymentId: string) => void;
  onMarkPaymentPending?: (paymentId: string) => void;
  /** Saved-sale preview: dates in the locale format, and no prompt to fill payments. */
  variant?: "editor" | "record";
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
  saleId,
  canManagePaymentStatus = false,
  updatingPaymentId = null,
  onMarkPaymentPaid,
  onMarkPaymentPending,
  variant = "editor",
}: SaleSummaryProps) => {
  const showDate = (value?: string) => {
    if (!value) return "";
    return variant === "record" ? formatDate(value) : value;
  };
  const money = (amount: number, paymentCurrency?: string) =>
    amount.toLocaleString("pt-BR", { style: "currency", currency: paymentCurrency || currency });
  const editStep = (step: number) => (saleId ? `/vendas/${saleId}/editar?step=${step}` : "");

  const wrapSection = (step: number, label: string, content: React.ReactNode) => {
    if (!saleId) return content;
    return (
      <EditableSection editTo={editStep(step)} label={label}>
        {content}
      </EditableSection>
    );
  };

  return (
    <div className="space-y-4 text-sm">
      {wrapSection(1, "Editar clientes", (
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
                  {customer.telefone ? <p className="text-xs text-muted-foreground">{customer.telefone}</p> : null}
                  {customer.email && <p className="text-xs text-muted-foreground">{customer.email}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <Separator />

      {wrapSection(2, "Editar produtos", (
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
                  {item.releaseDate && <p className="text-xs text-muted-foreground">Liberação: {showDate(item.releaseDate)}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="italic text-muted-foreground">Não selecionado</p>
          )}
        </div>
      ))}

      <Separator />

      {wrapSection(3, "Editar pagamentos", (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" />
            Pagamentos
          </div>
          {configuredPayments.length === 0 ? (
            <p className="italic text-muted-foreground">Nenhum pagamento configurado</p>
          ) : (
            <ul className="space-y-2">
              {configuredPayments.map((payment, index) => {
                const lineCurrency = payment.currency || currency;
                const installmentLabel = formatInstallmentLabel(payment, lineCurrency, {
                  allPayments: configuredPayments,
                  index,
                });
                const normalizedStatus = normalizeBillingStatus(payment.status);
                const isPaid = normalizedStatus === "PAID";
                const isUpdating = Boolean(payment.id && updatingPaymentId === payment.id);
                const canManageThisPayment = canManagePaymentStatus && Boolean(payment.id);

                return (
                <li key={payment.id ?? index} className="rounded-md border p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{payment.gateway}</p>
                    {payment.status && (
                      <Badge
                        variant="outline"
                        className={`h-5 px-1.5 text-[10px] ${isPaid ? "border-emerald-500/40 text-emerald-700" : ""}`}
                      >
                        {billingStatusLabel(payment.status)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    {PAYMENT_TYPE_LABELS[payment.paymentType] ?? payment.paymentType}
                    {(() => {
                      const feeRate = getFeeRate(payment.gateway, payment.paymentType);
                      return feeRate > 0 ? ` - taxa ${feeRate}%` : "";
                    })()}
                  </p>
                  {(payment.billingType || (payment.paymentType === "SUBSCRIPTION" && payment.ciclo)) && (
                    <p className="text-xs text-muted-foreground">
                      {payment.billingType ? (
                        <>Cobrança: {BILLING_TYPE_LABELS[payment.billingType] ?? payment.billingType}</>
                      ) : null}
                      {payment.billingType && payment.paymentType === "SUBSCRIPTION" && payment.ciclo ? " · " : null}
                      {payment.paymentType === "SUBSCRIPTION" && payment.ciclo ? (
                        <>Ciclo: {SUBSCRIPTION_CYCLE_LABELS[payment.ciclo] ?? payment.ciclo}</>
                      ) : null}
                    </p>
                  )}
                  <p className="font-medium">
                    {money(getPaymentGrossValue(payment, configuredPayments), lineCurrency)}
                  </p>
                  {installmentLabel && (
                    <p className="text-xs text-muted-foreground">{installmentLabel}</p>
                  )}
                  {payment.dueDate && <p className="text-xs text-muted-foreground">Vencimento: {showDate(payment.dueDate)}</p>}
                  {payment.paymentDate && (
                    <p className="text-xs text-muted-foreground">Pago em: {showDate(payment.paymentDate)}</p>
                  )}
                  {payment.linkPagamento && (
                    <div className="mt-2 space-y-1.5 rounded-md border border-dashed border-primary/30 bg-primary/5 p-2">
                      <p className="text-xs font-medium text-muted-foreground">Link de pagamento</p>
                      <p className="break-all text-xs text-foreground">{payment.linkPagamento}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                          <a href={payment.linkPagamento} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                            Abrir
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => {
                            void navigator.clipboard.writeText(payment.linkPagamento!);
                            toast.success("Link copiado.");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                          Copiar
                        </Button>
                      </div>
                    </div>
                  )}
                    </div>

                    {canManageThisPayment && (
                      <div className="shrink-0">
                        {!isPaid ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 gap-1 px-2 text-[11px]"
                            disabled={isUpdating}
                            onClick={() => onMarkPaymentPaid?.(payment.id!)}
                          >
                            {isUpdating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CircleCheck className="h-3.5 w-3.5" />
                            )}
                            Marcar como pago
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 px-2 text-[11px]"
                            disabled={isUpdating}
                            onClick={() => onMarkPaymentPending?.(payment.id!)}
                          >
                            {isUpdating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Clock3 className="h-3.5 w-3.5" />
                            )}
                            Marcar como pendente
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}

      {configuredPayments.length > 0 || variant !== "record" ? (
      <>
      <Separator />

      <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" />
        Comissão estimada
      </div>
      {configuredPayments.length > 0 ? (
        <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="text-xl font-bold text-primary">
            {money(estimatedCommission)}
          </p>

          <div className="space-y-0.5">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Award className="h-3 w-3" />
              <Notranslate>{careerPlanName ?? "Não carregado"}</Notranslate> · {commissionBreakdown.commissionRate}%
            </p>
            {showCommissionRateWarning && commissionBreakdown.commissionRate === 0 && (
              <p className="text-xs text-amber-700">
                Taxa não encontrada; recarregue o login.
              </p>
            )}
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Banknote className="h-3 w-3" />
              Bruto total: {money(commissionBreakdown.totalGross)}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Landmark className="h-3 w-3" />
              Taxas gateway: {money(commissionBreakdown.totalFees)}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3" />
              Líquido: {money(commissionBreakdown.totalNet)}
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {commissionBreakdown.payments.map((payment, idx) => {
              const installmentLabel = configuredPayments[idx]
                ? formatInstallmentLabel(configuredPayments[idx], configuredPayments[idx].currency || currency, {
                    allPayments: configuredPayments,
                    index: idx,
                  })
                : null;

              return (
              <div key={`${payment.gateway}-${payment.paymentType}-${idx}`} className="rounded-md border bg-background p-2 space-y-0.5">
                <p className="text-xs font-semibold text-foreground">
                  {payment.gateway} · {PAYMENT_TYPE_LABELS[configuredPayments[idx]?.paymentType ?? payment.paymentType] ?? payment.paymentType}
                </p>
                {installmentLabel && (
                  <p className="text-xs text-muted-foreground">{installmentLabel}</p>
                )}
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><Banknote className="h-3 w-3" /> Bruto: {money(payment.grossAmount)}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><MinusCircle className="h-3 w-3" /> Taxa ({payment.feeRate}%): {money(payment.feeAmount)}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingDown className="h-3 w-3" /> Líquido: {money(payment.netAmount)}</p>
                <p className="flex items-center gap-1 text-xs font-medium text-primary"><TrendingUp className="h-3 w-3" /> Comissao: {money(payment.commissionAmount)}</p>

                {payment.paymentType === "SUBSCRIPTION" && payment.monthlyCommissions && (
                  <div className="mt-1.5 rounded border border-dashed p-1.5 space-y-1">
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                      <CreditCard className="h-3 w-3" /> {payment.monthlyCommissions.length} parcelas mensais
                    </p>
                    {payment.monthlyCommissions.slice(0, 24).map((month) => (
                      <div key={month.month} className="grid gap-0.5 text-[11px] text-muted-foreground md:grid-cols-[1fr_auto] md:items-center md:gap-2">
                        <span>{getSubscriptionMonthLabel(configuredPayments[idx]?.dueDate, month.month, subscriptionMonthLabelMode)}</span>
                        <span className="flex flex-wrap items-center gap-x-1.5 md:justify-end">
                          <span className="text-muted-foreground/70">bruto {money(month.grossAmount)}</span>
                          <span className="font-medium text-foreground">→ {money(month.commissionAmount)}</span>
                        </span>
                      </div>
                    ))}
                    {payment.monthlyCommissions.length > 24 && (
                      <p className="text-[11px] text-muted-foreground">... +{payment.monthlyCommissions.length - 24} meses</p>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="italic text-muted-foreground">Preencha os pagamentos para calcular</p>
      )}
      </div>
      </>
      ) : null}
    </div>
  );
};

export default SaleSummary;
