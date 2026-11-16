import type { CommissionBreakdownResult } from "@/services/commissionApi";
import { Notranslate } from "@/components/Notranslate";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Award,
  Banknote,
  BookOpen,
  CircleCheck,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Landmark,
  Loader2,
  MinusCircle,
  Package,
  Pencil,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { PAYMENT_TYPE_LABELS, SUBSCRIPTION_CYCLE_LABELS } from "../constants";
import type { ConfiguredSalePayment, FilledSaleCustomer, SaleSummaryItem } from "../types";
import EditableSection from "@/features/sales/organisms/EditableSection";
import CommissionPayControl from "@/features/sales/organisms/CommissionPayControl";
import { billingStatusLabel, normalizeBillingStatus } from "@/features/billing-calendar/utils";
import StripeMark from "@/components/icons/StripeMark";
import { Badge } from "@/components/ui/badge";
import { formatInstallmentLabel, getPaymentGrossValue } from "@/shared/utils/payment";
import { formatPaymentChargeLabel } from "@/features/sales/utils/chargeLabel";
import { isCancelledStatus, PAYMENT_REVERT_BLOCKED_MESSAGE } from "@/features/sales/utils/commissionStatus";
import { formatDate } from "@/shared/utils/format";
import { t } from "@/i18n";
import type { CourseSummaryModel } from "@/features/new-sale/courses/copy";

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
  onOpenStripeCheckout?: (paymentId: string) => void;
  canPayCommission?: boolean;
  payingCommissionPaymentId?: string | null;
  onPayCommission?: (paymentId: string) => void;
  /** Saved-sale preview: dates in the locale format, and no prompt to fill payments. */
  variant?: "editor" | "record";
  /** When set, the products block becomes the chosen courses. */
  courseSummary?: CourseSummaryModel;
  courseLayout?: "compact" | "table";
  onEditStep?: (step: number) => void;
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
  onOpenStripeCheckout,
  canPayCommission = false,
  payingCommissionPaymentId = null,
  onPayCommission,
  variant = "editor",
  courseSummary,
  courseLayout = "compact",
  onEditStep,
}: SaleSummaryProps) => {
  const showDate = (value?: string) => {
    if (!value) return "";
    return variant === "record" ? formatDate(value) : value;
  };
  const heading = (step: number, icon: React.ReactNode, label: string) => (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      {onEditStep ? (
        <button type="button" onClick={() => onEditStep(step)} className="inline-flex h-8 items-center gap-1 text-[13px] font-semibold text-primary">
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          {t("sales.actions.edit")}
        </button>
      ) : null}
    </div>
  );
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

  const estimateEntries = commissionBreakdown.payments
    .map((row, index) => ({ row, source: configuredPayments[index], index }))
    .filter((entry) => !isCancelledStatus(entry.source?.status));
  const estimateGross = estimateEntries.reduce((acc, entry) => acc + entry.row.grossAmount, 0);
  const estimateFees = estimateEntries.reduce((acc, entry) => acc + entry.row.feeAmount, 0);
  const estimateNet = estimateEntries.reduce((acc, entry) => acc + entry.row.netAmount, 0);

  return (
    <div className="space-y-4 text-sm">
      {wrapSection(1, "Editar clientes", (
        <div className="space-y-1.5">
          {heading(1, <User className="h-3.5 w-3.5" />, "Clientes")}
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

      {wrapSection(2, courseSummary ? t("sales.actions.edit") : "Editar produtos", (
        <div className="space-y-1.5">
          {heading(
            2,
            courseSummary ? <BookOpen className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />,
            courseSummary ? (courseLayout === "table" ? t("sale.summary.coursesAccess") : t("sale.preview.courses")) : t("sale.preview.products"),
          )}
          {courseSummary ? (
            courseLayout === "table" ? (
              <div>
                {courseSummary.rows.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">{t("sale.preview.noCourses")}</p>
                ) : (
                  <table className="w-full border-collapse text-[13.5px]">
                    <thead>
                      <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        <th className="pb-2 pr-2 font-semibold">{t("sale.summary.item")}</th>
                        <th className="pb-2 pr-2 font-semibold">{t("sale.summary.period")}</th>
                        <th className="hidden pb-2 font-semibold sm:table-cell">{t("sale.access.duration")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseSummary.rows.map((row) => (
                        <tr key={row.key} className="border-t border-border/60 align-top">
                          <td className="py-3 pr-2">
                            <p className="font-semibold">{row.title}</p>
                            <p className="text-[12.5px] text-muted-foreground">{row.detail}</p>
                          </td>
                          <td className="whitespace-nowrap py-3 pr-2 tabular-nums">{row.period}</td>
                          <td className="hidden whitespace-nowrap py-3 tabular-nums sm:table-cell">{row.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {courseSummary.notIncluded ? (
                  <p className="mt-3 text-[13px] text-muted-foreground">{courseSummary.notIncluded}</p>
                ) : null}
                {courseSummary.summaryNote ? (
                  <p className="mt-3 text-[13px] text-muted-foreground">{courseSummary.summaryNote}</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-1.5">
                {courseSummary.groups.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">{t("sale.preview.noCourses")}</p>
                ) : courseSummary.groups.map((group) => (
                  <div key={group.courseId}>
                    <p className="font-medium leading-tight">{group.title}</p>
                    {group.detail ? <p className="text-xs text-muted-foreground">{group.detail}</p> : null}
                  </div>
                ))}
                {courseSummary.groups.length > 0 ? (
                  <p className={`text-xs ${courseSummary.tone === "error" ? "text-[#9A3F3F]" : "text-muted-foreground"}`}>{courseSummary.period}</p>
                ) : null}
              </div>
            )
          ) : saleItems.length > 0 ? (
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
          {heading(3, <CreditCard className="h-3.5 w-3.5" />, "Pagamentos")}
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
                const isCancelled = normalizedStatus === "CANCELLED";
                const isUpdating = Boolean(payment.id && updatingPaymentId === payment.id);
                const canManageThisPayment = canManagePaymentStatus && Boolean(payment.id) && !isCancelled;
                const commissionAlreadyPaid = String(payment.commission?.status ?? "").toUpperCase() === "PAID";
                const canOpenStripeCheckout = Boolean(
                  onOpenStripeCheckout && payment.id && payment.gateway === "STRIPE",
                );
                const chargeLabel = formatPaymentChargeLabel({
                  gateway: payment.gateway,
                  billingType: payment.billingType,
                  stripePaymentMethod: payment.stripePaymentMethod,
                  status: payment.status,
                  paymentType: payment.paymentType,
                });
                const cycleLabel = payment.paymentType === "SUBSCRIPTION" && payment.ciclo
                  ? `Ciclo: ${SUBSCRIPTION_CYCLE_LABELS[payment.ciclo] ?? payment.ciclo}`
                  : null;

                return (
                <li key={payment.id ?? index} className={`rounded-md border p-2 ${isCancelled ? "border-border bg-muted/50" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{payment.gateway}</p>
                    {payment.status && (
                      <Badge
                        variant="outline"
                        className={`h-5 px-1.5 text-[10px] ${
                          isPaid
                            ? "border-emerald-500/40 text-emerald-700"
                            : isCancelled
                              ? "border-border bg-muted text-muted-foreground"
                              : ""
                        }`}
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
                  {(chargeLabel || cycleLabel) && (
                    <p className="text-xs text-muted-foreground">
                      {chargeLabel}
                      {chargeLabel && cycleLabel ? " · " : null}
                      {cycleLabel}
                    </p>
                  )}
                  <p className="font-medium">
                    {money(getPaymentGrossValue(payment, configuredPayments), lineCurrency)}
                  </p>
                  {installmentLabel && (
                    <p className="text-xs text-muted-foreground">{installmentLabel}</p>
                  )}
                  {payment.dueDate && <p className="text-xs text-muted-foreground">Vencimento: {showDate(payment.dueDate)}</p>}
                  {isPaid && payment.paymentDate && (
                    <p className="text-xs text-muted-foreground">Pago em: {showDate(payment.paymentDate)}</p>
                  )}
                  <CommissionPayControl
                    commission={payment.commission}
                    canPayCommission={canPayCommission}
                    isPaying={Boolean(payment.id && payingCommissionPaymentId === payment.id)}
                    onPay={payment.id && onPayCommission ? () => onPayCommission(payment.id!) : undefined}
                  />
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

                    {(canManageThisPayment || canOpenStripeCheckout) && (
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {canOpenStripeCheckout && (
                          <Button
                            type="button"
                            variant="success"
                            size="sm"
                            className="h-7 gap-1 px-2 text-[11px]"
                            aria-label={
                              payment.linkPagamento
                                ? "Abrir link de pagamento Stripe"
                                : "Gerar link de pagamento Stripe"
                            }
                            onClick={() => onOpenStripeCheckout?.(payment.id!)}
                          >
                            <StripeMark className="h-3.5 w-3.5" />
                            {payment.linkPagamento ? "Link Stripe" : "Gerar link Stripe"}
                          </Button>
                        )}
                        {canManageThisPayment && !isPaid && (
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
                        )}
                        {canManageThisPayment && isPaid && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 px-2 text-[11px]"
                            disabled={isUpdating || commissionAlreadyPaid}
                            title={commissionAlreadyPaid ? PAYMENT_REVERT_BLOCKED_MESSAGE : undefined}
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
              Bruto total: {money(estimateGross)}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Landmark className="h-3 w-3" />
              Taxas gateway: {money(estimateFees)}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3" />
              Líquido: {money(estimateNet)}
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {estimateEntries.map(({ row: payment, source, index: idx }) => {
              const installmentLabel = source
                ? formatInstallmentLabel(source, source.currency || currency, {
                    allPayments: configuredPayments,
                    index: idx,
                  })
                : null;

              return (
              <div key={`${payment.gateway}-${payment.paymentType}-${idx}`} className="rounded-md border bg-background p-2 space-y-0.5">
                <p className="text-xs font-semibold text-foreground">
                  {payment.gateway} · {PAYMENT_TYPE_LABELS[source?.paymentType ?? payment.paymentType] ?? payment.paymentType}
                </p>
                {installmentLabel && (
                  <p className="text-xs text-muted-foreground">{installmentLabel}</p>
                )}
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><Banknote className="h-3 w-3" /> Bruto: {money(payment.grossAmount)}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><MinusCircle className="h-3 w-3" /> Taxa ({payment.feeRate}%): {money(payment.feeAmount)}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingDown className="h-3 w-3" /> Líquido: {money(payment.netAmount)}</p>
                <p className="flex items-center gap-1 text-xs font-medium text-primary"><TrendingUp className="h-3 w-3" /> Comissao: {money(payment.commissionAmount)}</p>
                <CommissionPayControl
                  commission={source?.commission}
                  canPayCommission={canPayCommission}
                  isPaying={Boolean(source?.id && payingCommissionPaymentId === source.id)}
                  onPay={
                    source?.id && onPayCommission
                      ? () => onPayCommission(source.id!)
                      : undefined
                  }
                />

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
