import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import type { SaleRecord } from "@/services/commercialApi";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import StripeMark from "@/components/icons/StripeMark";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { t, tCount, type MessageKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { hasRole, getProfile } from "@/lib/session";
import { isSaleOwner } from "@/features/contracts/access";
import { canMutateSales } from "@/services/usersApi";
import { Archive, Eye, Link as LinkIcon } from "lucide-react";
import {
  getInstallmentPaymentsProgress,
  getSaleCommissionValue,
  getSaleContractValue,
  getSaleProductName,
  getSaleSellerInfo,
  getSubscriptionPaymentsProgress,
  isSelfServiceSale,
  saleAllowsStripeCheckoutLink,
  saleClientNames,
  saleHasCancelledPayments,
  saleStatusLabel,
  type SalePaymentsProgress,
} from "../utils";
import { isCancelledStatus } from "@/features/sales/utils/commissionStatus";
import { saleHasPaymentLink } from "@/features/sales/utils/paymentLink";
import { saleOffersHotmartCheckout } from "@/features/sales/utils/hotmartCheckout";
import CreatePaymentLinkDialog from "./CreatePaymentLinkDialog";
import { HotmartCheckoutLinkDialog } from "./HotmartCheckoutLink";
import SendPaymentLinkDialog from "./SendPaymentLinkDialog";
import StripeCheckoutLinkDialog from "./StripeCheckoutLinkDialog";
import { useSaleArchiveDelete } from "./SaleArchiveDeleteActions";
import ViewPaymentLinkDialog from "./ViewPaymentLinkDialog";

type SaleListCardProps = {
  sale: SaleRecord;
};

function IconTip({ tip, children }: { tip: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

export function SalesListHeader() {
  return (
    <div className="sale-list-head text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
      <span>{t("sales.list.colClient")}</span>
      <span>{t("sales.list.colSeller")}</span>
      <span>{t("sales.list.colContract")}</span>
      <span>{t("sales.list.colPayments")}</span>
      <span>{t("sales.list.colStatus")}</span>
      <span />
    </div>
  );
}

const ACTION =
  "sale-action inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-foreground/10 bg-transparent px-2.5 text-[13px] font-medium text-foreground shadow-none hover:bg-foreground/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

function paidPhrase(
  group: "sales.card.paidInstallments" | "sales.card.paidSubscriptions",
  paid: number,
  total: number,
) {
  return t(`${group}.${total === 1 ? "one" : "other"}` as MessageKey, { paid, total });
}

function progressNote(kind: "installment" | "subscription", progress: SalePaymentsProgress, cancelled: boolean) {
  if (progress.pending > 0) return tCount("sales.card.pending", progress.pending);
  if (cancelled) {
    return t(kind === "subscription" ? "sales.card.subscriptionCancelled" : "sales.card.installmentCancelled");
  }
  return t(kind === "subscription" ? "sales.card.subscriptionSettled" : "sales.card.installmentSettled");
}

function paymentCell(sale: SaleRecord) {
  const installments = getInstallmentPaymentsProgress(sale);
  const subscription = getSubscriptionPaymentsProgress(sale);
  const summary = sale.financialSummary?.payments;

  const fromProgress = (
    group: "sales.card.paidInstallments" | "sales.card.paidSubscriptions",
    progress: SalePaymentsProgress,
    kind: "installment" | "subscription",
    cancelled: boolean,
  ) => ({
    value: kind === "installment"
      ? t(progress.total === 1 ? "sales.list.paidOf.one" : "sales.list.paidOf.other", { p: progress.paid, n: progress.total })
      : paidPhrase(group, progress.paid, progress.total),
    ratio: progress.total > 0 ? (progress.paid / progress.total) * 100 : 0,
    settled: progress.pending === 0 && !cancelled && progress.total > 0,
    note: progressNote(kind, progress, cancelled),
  });

  if (installments) {
    const cancelled = installments.pending === 0 && saleHasCancelledPayments(sale, "INSTALLMENT");
    return fromProgress("sales.card.paidInstallments", installments, "installment", cancelled);
  }
  if (subscription) {
    const cancelled = subscription.pending === 0 && saleHasCancelledPayments(sale, "SUBSCRIPTION");
    return fromProgress("sales.card.paidSubscriptions", subscription, "subscription", cancelled);
  }
  if (summary?.installmentTotal && summary.installmentTotal > 0) {
    const paid = summary.installmentPaid ?? 0;
    const total = summary.installmentTotal;
    const pending = summary.installmentPending ?? Math.max(0, total - paid);
    return fromProgress("sales.card.paidInstallments", { paid, total, pending }, "installment", false);
  }
  if (summary && summary.subscriptionTotal > 0) {
    return fromProgress(
      "sales.card.paidSubscriptions",
      { paid: summary.subscriptionPaid, total: summary.subscriptionTotal, pending: summary.subscriptionPending },
      "subscription",
      false,
    );
  }
  if (summary && summary.total > 0) {
    return fromProgress(
      "sales.card.paidInstallments",
      { paid: summary.paid, total: summary.total, pending: summary.pending },
      "installment",
      false,
    );
  }
  const payments = sale.payments ?? [];
  if (payments.length > 0) {
    const active = payments.filter((payment) => !isCancelledStatus(payment.status));
    const paid = active.filter((payment) => String(payment.status).toUpperCase() === "PAID").length;
    const progress = { paid, total: active.length, pending: active.length - paid };
    return fromProgress(
      "sales.card.paidInstallments",
      progress,
      "installment",
      progress.pending === 0 && saleHasCancelledPayments(sale),
    );
  }
  return {
    value: paidPhrase("sales.card.paidInstallments", 0, 0),
    ratio: 0,
    settled: false,
    note: null,
  };
}

const SaleListCard = ({ sale }: SaleListCardProps) => {
  const profile = getProfile();
  const isAdmin = hasRole("ADMIN");
  const canMutate = canMutateSales(profile?.role);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [createLinkOpen, setCreateLinkOpen] = useState(false);
  const [viewLinkOpen, setViewLinkOpen] = useState(false);
  const [stripeOpen, setStripeOpen] = useState(false);
  const [hotmartOpen, setHotmartOpen] = useState(false);
  const archiveActions = useSaleArchiveDelete(sale);
  const names = saleClientNames(sale);
  const clientTitle = names.length > 0 ? names.join(", ") : t("sales.card.unknownClient");
  const contractValue = getSaleContractValue(sale);
  const commissionValue = getSaleCommissionValue(sale);
  const payments = paymentCell(sale);
  const subscriptionProgress = getSubscriptionPaymentsProgress(sale);
  const sellerName = isSelfServiceSale(sale)
    ? getSaleSellerInfo(sale)
    : sale.seller?.name?.trim() || t("sales.card.noSeller");
  const hasPaymentLink = saleHasPaymentLink(sale);
  const hasPayments = (sale.payments?.length ?? 0) > 0;
  const hasStripePayment = sale.payments?.some((payment) => payment.gateway === "STRIPE") ?? false;
  const hasHotmartCheckout = saleOffersHotmartCheckout(sale);
  const isArchived = String(sale.status).toUpperCase() === "ARCHIVED";
  const subscriptionCancelled =
    subscriptionProgress != null
    && subscriptionProgress.pending === 0
    && saleHasCancelledPayments(sale, "SUBSCRIPTION");
  const statusLabel = saleStatusLabel(sale.status);
  const hideStatus = subscriptionCancelled && statusLabel === "Pendente";
  const productName = getSaleProductName(sale);
  const meta = `${names.length ? clientTitle : t("sales.card.unknownClient")} · ${sellerName} · ${formatDate(sale.soldAt)}`;
  const nameId = `sale-name-${sale.id}`;
  const currency = sale.currency || "BRL";
  const showStripe = canMutate && !isArchived && hasStripePayment && !subscriptionCancelled && saleAllowsStripeCheckoutLink(sale);
  const showViewLink = hasPaymentLink && !subscriptionCancelled;
  const showCreateLink = canMutate && !hasPaymentLink && !isArchived && !subscriptionCancelled;
  const showWhatsapp = canMutate && !isArchived;
  const showEdit = canMutate && !isArchived;
  const canArchive = !archiveActions.isArchived && (isAdmin || isSaleOwner(sale));
  const showMenu = showStripe || hasHotmartCheckout || showWhatsapp || showEdit || (isAdmin && !archiveActions.isArchived);
  const concluded = String(sale.status).toUpperCase() === "CONCLUDED";
  const dotClass = isArchived ? "bg-muted-foreground" : concluded ? "bg-[#7FA88A]" : "bg-[#C9A15A]";
  const statusClass = isArchived ? "text-muted-foreground" : concluded ? "text-[#2F5A43]" : "text-[#8A611F]";

  return (
    <>
      <article
        aria-labelledby={nameId}
        className={cn(
          "sale-card rounded-md bg-card p-3 shadow-[0_1px_2px_rgba(36,56,79,0.06),0_4px_12px_rgba(36,56,79,0.06)]",
          isArchived && "opacity-[.72]",
        )}
      >
        <div className="sale-zone sale-zone-client min-w-0">
          <div className="flex min-w-0 items-start gap-1.5">
            <h2 id={nameId} title={clientTitle} className="sale-client-name min-w-0 text-[15px] font-semibold leading-snug">
              {names[0] ?? clientTitle}
            </h2>
            {names.length > 1 ? (
              <span className="shrink-0 text-[13px] font-semibold leading-snug text-muted-foreground">+{names.length - 1}</span>
            ) : null}
          </div>
          <p title={productName} className="truncate text-[13px] text-muted-foreground">{productName}</p>
        </div>
        {hideStatus ? <span className="sale-zone sale-zone-status" /> : (
          <p className={cn("sale-zone sale-zone-status flex items-center gap-1.5 text-[13px] font-semibold", statusClass)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} aria-hidden="true" />
            {statusLabel}
          </p>
        )}
        <div className="sale-zone sale-zone-seller">
          <p className="sale-zone-label text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{t("sales.list.sellerShort")}</p>
          <p title={meta} className="sale-seller-name text-sm">{sellerName}</p>
          <p className="text-[13px] text-muted-foreground">{formatDate(sale.soldAt)}</p>
        </div>
        <div className="sale-zone sale-zone-contract">
          <p className="sale-zone-label text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{t("sales.list.colContract")}</p>
          <p className="sale-money text-[15px] font-semibold tabular-nums">{formatCurrency(contractValue, currency)}</p>
          <p className="text-[13px] text-muted-foreground">
            <span>{t("sales.card.commission")}</span> {formatCurrency(commissionValue, "BRL")}
          </p>
        </div>
        <div className="sale-zone sale-zone-payments">
          <p className="sale-zone-label text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{t("sales.list.colPayments")}</p>
          <p className="sale-payments-value text-sm font-semibold">{payments.value}</p>
          {payments.note ? <p className="text-xs text-muted-foreground">{payments.note}</p> : null}
          {payments.ratio != null ? (
            <div className="my-1 h-1 overflow-hidden rounded-sm bg-border" aria-hidden="true">
              <span className={cn("block h-full", payments.settled ? "bg-[#7FA88A]" : "bg-[#2F5679]")} style={{ width: `${payments.ratio}%` }} />
            </div>
          ) : null}
        </div>

        <div className="sale-card-acts">
          <TooltipProvider delayDuration={200}>
            {showViewLink ? (
              <IconTip tip={t("sales.actions.viewLinkTitle")}>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(ACTION, "sale-icon-btn text-primary")}
                  aria-label={t("sales.actions.viewLink")}
                  onClick={() => setViewLinkOpen(true)}
                >
                  <LinkIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
              </IconTip>
            ) : showCreateLink ? (
              <IconTip tip={hasPayments ? t("sales.actions.createLinkTitle") : t("sales.actions.noPayments")}>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(ACTION, "sale-icon-btn text-primary", !hasPayments && "cursor-not-allowed")}
                  aria-disabled={!hasPayments}
                  aria-label={t("sales.actions.paymentLink")}
                  onClick={() => {
                    if (hasPayments) setCreateLinkOpen(true);
                  }}
                >
                  <LinkIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
              </IconTip>
            ) : null}
            <IconTip tip={t("sales.actions.details")}>
              <Link
                to={`/vendas/${sale.id}`}
                className={cn(ACTION, "sale-icon-btn sale-compact")}
                aria-label={t("sales.actions.details")}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </Link>
            </IconTip>
            {canArchive ? (
              <IconTip tip={t("sales.actions.archive")}>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(ACTION, "sale-icon-btn")}
                  aria-label={t("sales.actions.archive")}
                  onClick={archiveActions.openArchive}
                >
                  <Archive className="h-4 w-4" aria-hidden="true" />
                </Button>
              </IconTip>
            ) : null}
            {showMenu ? (
              <details className="relative">
                <summary
                  className={cn(ACTION, "sale-compact cursor-pointer list-none px-3")}
                  aria-label={t("sales.actions.more")}
                  title={t("sales.actions.more")}
                >
                  …
                </summary>
                <div className="absolute right-0 z-20 mt-1 min-w-[200px] rounded-md border bg-popover p-1 shadow-md">
                  {showStripe ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm"
                      aria-label={t("sales.actions.stripeName")}
                      onClick={() => setStripeOpen(true)}
                    >
                      <StripeMark className="h-4 w-4" />
                      {t("sales.actions.stripe")}
                    </button>
                  ) : null}
                  {hasHotmartCheckout ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm"
                      aria-label={t("sales.actions.hotmartOpen")}
                      onClick={() => setHotmartOpen(true)}
                    >
                      <LinkIcon className="h-4 w-4" aria-hidden="true" />
                      {t("sales.actions.hotmart")}
                    </button>
                  ) : null}
                  {showWhatsapp ? (
                    <button
                      type="button"
                      className="block w-full px-2 py-2 text-left text-sm disabled:opacity-50"
                      disabled={!hasPaymentLink}
                      onClick={() => { if (hasPaymentLink) setWhatsappOpen(true); }}
                    >
                      {t("sales.actions.whatsapp")}
                    </button>
                  ) : null}
                  {showEdit ? (
                    <Link to={`/vendas/${sale.id}/editar`} className="block px-2 py-2 text-sm" aria-label={t("sales.actions.edit")}>
                      {t("sales.actions.edit")}
                    </Link>
                  ) : null}
                  {isAdmin && !archiveActions.isArchived ? (
                    <button
                      type="button"
                      className="block w-full px-2 py-2 text-left text-sm text-[#9A3F3F]"
                      aria-label={t("sales.actions.remove")}
                      onClick={() => { if (!archiveActions.hasPaid) archiveActions.openDelete(); }}
                    >
                      {t("sales.actions.remove")}
                    </button>
                  ) : null}
                </div>
              </details>
            ) : null}
          </TooltipProvider>
        </div>
      </article>

      <CreatePaymentLinkDialog sale={sale} open={createLinkOpen} onOpenChange={setCreateLinkOpen} />
      <ViewPaymentLinkDialog sale={sale} open={viewLinkOpen} onOpenChange={setViewLinkOpen} />
      <SendPaymentLinkDialog sale={sale} open={whatsappOpen} onOpenChange={setWhatsappOpen} />
      <StripeCheckoutLinkDialog sale={sale} open={stripeOpen} onOpenChange={setStripeOpen} />
      <HotmartCheckoutLinkDialog sale={sale} open={hotmartOpen} onOpenChange={setHotmartOpen} />
      {archiveActions.dialogs}
    </>
  );
};

export default SaleListCard;
