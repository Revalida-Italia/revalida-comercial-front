import { useMemo } from "react";
import type { SaleRecord, SalesSummary } from "@/services/commercialApi";
import type { DisplayCurrency } from "@/services/exchangeRatesApi";
import { PAYMENT_TYPE_LABELS, SALE_STATUS_OPTIONS } from "@/features/new-sale/constants";
import {
  getSaleCustomerNames,
  getSaleProductName,
} from "@/features/sales/utils";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import { toNumberOrZero } from "@/shared/utils/number";
import { formatInstallmentLabel, getSubscriptionPaymentSequence, isMonthlySubscriptionPayment, toPaymentGrossValueContext } from "@/shared/utils/payment";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type NetReceivedMonthAuditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sales: SaleRecord[];
  summary: SalesSummary;
  displayCurrency?: DisplayCurrency;
};

type AuditPaymentDisplay = {
  key: string;
  kind: "subscription" | "other";
  label: string;
  status?: string;
};

type AuditSaleRow = {
  key: string;
  customer: string;
  product: string;
  soldAt: string;
  payments: AuditPaymentDisplay[];
  status: string;
  gross: number;
  fee: number;
  commission: number;
  netReceived: number;
  isTotal?: boolean;
};

const GATEWAY_LABELS: Record<string, string> = {
  HOTMART: "Hotmart",
  NUBANK: "Nubank",
  PAYPAL: "PayPal",
  ASAAS: "Asaas",
  WISE: "Wise",
};

const SALE_STATUS_LABELS = Object.fromEntries(
  SALE_STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

function formatGatewayLabel(gateway: string) {
  return GATEWAY_LABELS[gateway] ?? gateway;
}

function paymentStatusLabel(status?: string) {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "PAID") return "Pago";
  if (normalized === "PENDING" || !normalized) return "Pendente";
  return status ?? "Pendente";
}

function formatSalePayments(sale: SaleRecord): AuditPaymentDisplay[] {
  const currency = sale.currency || "BRL";
  const payments = sale.payments ?? [];
  const paymentContext = toPaymentGrossValueContext(payments);

  return payments.map((payment, index) => {
    const contextPayment = paymentContext[index];
    const isSubscriptionMonth =
      Boolean(contextPayment) &&
      isMonthlySubscriptionPayment(contextPayment, paymentContext);

    if (isSubscriptionMonth && contextPayment) {
      const sequence = getSubscriptionPaymentSequence(contextPayment, paymentContext, index);

      return {
        key: payment.id || `${sale.id}-payment-${index}`,
        kind: "subscription" as const,
        label: `${sequence}ª parcela`,
        status: payment.status,
      };
    }

    const typeLabel = PAYMENT_TYPE_LABELS[payment.type] ?? payment.type;
    const gatewayLabel = formatGatewayLabel(payment.gateway);
    const installmentLabel = formatInstallmentLabel(contextPayment, currency, {
      allPayments: paymentContext,
      index,
    });

    return {
      key: payment.id || `${sale.id}-payment-${index}`,
      kind: "other" as const,
      label: installmentLabel
        ? `${gatewayLabel} · ${typeLabel} · ${installmentLabel}`
        : `${gatewayLabel} · ${typeLabel}`,
      status: payment.status,
    };
  });
}

function SaleStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const label = SALE_STATUS_LABELS[normalized] ?? status;

  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap px-2 py-0 text-[10px] font-medium",
        normalized === "ARCHIVED" && "border-amber-300 bg-amber-50 text-amber-800",
        normalized === "CONCLUDED" && "border-emerald-300 bg-emerald-50 text-emerald-800",
        normalized === "PENDING" && "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      {label}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status?: string }) {
  const normalized = String(status ?? "PENDING").toUpperCase();
  const isPaid = normalized === "PAID";

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 whitespace-nowrap px-1.5 py-0 text-[10px] font-medium",
        isPaid
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      {paymentStatusLabel(status)}
    </Badge>
  );
}

const NetReceivedMonthAuditDialog = ({
  open,
  onOpenChange,
  sales,
  summary,
  displayCurrency = "BRL",
}: NetReceivedMonthAuditDialogProps) => {
  const currency = summary.displayCurrency ?? displayCurrency;

  const { rows, monthSalesCount, totals } = useMemo(() => {
    const monthSales = sales.filter((sale) => {
      const month = sale.financialSummary?.month;
      return toNumberOrZero(month?.eligiblePayments) > 0 || toNumberOrZero(month?.netReceived) > 0;
    });

    const saleRows: AuditSaleRow[] = monthSales.map((sale) => {
      const month = sale.financialSummary?.month;

      return {
        key: sale.id,
        customer: getSaleCustomerNames(sale),
        product: getSaleProductName(sale),
        soldAt: formatDate(sale.soldAt),
        payments: formatSalePayments(sale),
        status: sale.status,
        gross: toNumberOrZero(month?.grossPayments),
        fee: toNumberOrZero(month?.gatewayFees),
        commission: toNumberOrZero(month?.commission),
        netReceived: toNumberOrZero(month?.netReceived),
      };
    });

    const aggregated = saleRows.reduce(
      (acc, row) => ({
        gross: acc.gross + row.gross,
        fee: acc.fee + row.fee,
        commission: acc.commission + row.commission,
        netReceived: acc.netReceived + row.netReceived,
      }),
      { gross: 0, fee: 0, commission: 0, netReceived: 0 },
    );

    return { rows: saleRows, monthSalesCount: monthSales.length, totals: aggregated };
  }, [sales]);

  const statCards = [
    { label: "Bruto do mês", value: toNumberOrZero(summary.grossPaymentsThisMonth ?? totals.gross), accent: "text-violet-700" },
    { label: "Taxas gateway", value: toNumberOrZero(summary.totalGatewayFeesThisMonth), accent: "text-amber-700" },
    {
      label: "Comissão do mês",
      value: toNumberOrZero(summary.comission ?? summary.commission),
      accent: "text-primary",
    },
    { label: "Recebido líquido", value: toNumberOrZero(summary.netReceivedThisMonth), accent: "text-sky-700" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:rounded-xl">
        <DialogHeader className="shrink-0 space-y-1.5 border-b bg-muted/20 px-5 py-4 pr-12 text-left">
          <DialogTitle className="text-base font-semibold tracking-tight">
            Extrato do recebido líquido do mês
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Uma linha por venda: bruto − taxa gateway − comissão = líquido. Assinaturas só entram quando pagas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-b px-4 py-3 sm:grid-cols-4 sm:gap-3 sm:px-5">
          {statCards.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border/60 bg-background px-3 py-2.5 shadow-sm"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className={cn("mt-0.5 truncate text-sm font-semibold tabular-nums", item.accent)}>
                {formatCurrency(item.value, currency)}
              </p>
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {monthSalesCount === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Nenhuma venda do mês com pagamentos elegíveis para compor o recebido líquido.
            </p>
          ) : (
            <div className="px-3 pb-3 pt-2 sm:px-4">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[640px] table-fixed border-collapse text-xs">
                  <colgroup>
                    <col className="w-[19%]" />
                    <col className="w-[24%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[11%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                    <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2.5 text-left font-medium">Cliente</th>
                      <th className="px-3 py-2.5 text-left font-medium">Pagamento</th>
                      <th className="px-3 py-2.5 text-left font-medium">Status</th>
                      <th className="px-3 py-2.5 text-right font-medium">Bruto</th>
                      <th className="px-3 py-2.5 text-right font-medium">Taxa</th>
                      <th className="px-3 py-2.5 text-right font-medium">Comissão</th>
                      <th className="px-3 py-2.5 text-right font-medium">Líquido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-3 align-top">
                          <p className="break-words font-medium leading-snug text-foreground">{row.customer}</p>
                          <p className="mt-0.5 break-words text-[11px] leading-snug text-muted-foreground">
                            {row.product}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{row.soldAt}</p>
                        </td>
                        <td className="px-3 py-3 align-top">
                          {row.payments.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <ul className="space-y-1">
                              {row.payments.map((payment) => (
                                <li
                                  key={payment.key}
                                  className="flex flex-wrap items-center gap-1.5 leading-snug"
                                >
                                  {payment.kind === "subscription" ? (
                                    <>
                                      <span className="text-muted-foreground">{payment.label}</span>
                                      <PaymentStatusBadge status={payment.status} />
                                    </>
                                  ) : (
                                    <span className="break-words text-muted-foreground">
                                      {payment.label}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <SaleStatusBadge status={row.status} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right align-top tabular-nums">
                          {formatCurrency(row.gross, currency)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right align-top tabular-nums text-amber-700">
                          − {formatCurrency(row.fee, currency)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right align-top tabular-nums text-primary">
                          − {formatCurrency(row.commission, currency)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right align-top font-medium tabular-nums text-sky-700">
                          {formatCurrency(row.netReceived, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-sky-50/80 font-semibold">
                      <td className="px-3 py-3 align-top" colSpan={3}>
                        <p>Total do mês</p>
                        <p className="text-[11px] font-normal text-muted-foreground">
                          {monthSalesCount} venda(s)
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right align-top tabular-nums">
                        {formatCurrency(totals.gross, currency)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right align-top tabular-nums text-amber-700">
                        − {formatCurrency(totals.fee, currency)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right align-top tabular-nums text-primary">
                        − {formatCurrency(totals.commission, currency)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right align-top tabular-nums text-sky-800">
                        {formatCurrency(totals.netReceived, currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NetReceivedMonthAuditDialog;
