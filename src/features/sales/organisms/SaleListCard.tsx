import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { SaleRecord } from "@/services/commercialApi";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import StripeMark from "@/components/icons/StripeMark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t, tCount, type MessageKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { hasRole, getProfile } from "@/lib/session";
import { canMutateSales } from "@/services/usersApi";
import {
  ChevronDown,
  Ellipsis,
  Eye,
  Link as LinkIcon,
  MessageCircle,
} from "lucide-react";
import {
  getInstallmentPaymentsProgress,
  getSaleCommissionValue,
  getSaleContractValue,
  getSaleNetContractValue,
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

const MAIN_BUTTON = "sale-main-btn h-9 gap-1.5 px-3 text-[13px] font-semibold";

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
    value: paidPhrase(group, progress.paid, progress.total),
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

function NumberCell({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{label}</p>
      <p className="overflow-hidden text-ellipsis text-[15px] font-semibold tabular-nums whitespace-nowrap">{value}</p>
      {children}
    </div>
  );
}

function SaleMoreMenu({ sale, canEdit, isAdmin }: { sale: SaleRecord; canEdit: boolean; isAdmin: boolean }) {
  const { isArchived, hasPaid, openArchive, openDelete, dialogs } = useSaleArchiveDelete(sale);
  const showArchive = isAdmin && !isArchived;
  if (!canEdit && !isAdmin) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="sale-icon-btn h-9 w-9 px-0"
            aria-label={t("sales.actions.more")}
            title={t("sales.actions.more")}
          >
            <Ellipsis className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px] rounded-md p-1.5 shadow-lg">
          {canEdit ? (
            <DropdownMenuItem asChild>
              <Link to={`/vendas/${sale.id}/editar`}>{t("sales.actions.edit")}</Link>
            </DropdownMenuItem>
          ) : null}
          {showArchive ? (
            <DropdownMenuItem onSelect={openArchive}>{t("sales.actions.archive")}</DropdownMenuItem>
          ) : null}
          {showArchive ? <DropdownMenuSeparator /> : null}
          {showArchive ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={hasPaid}
              title={hasPaid ? t("sales.actions.removeBlocked") : t("sales.actions.removeReady")}
              onSelect={openDelete}
            >
              {t("sales.actions.remove")}
            </DropdownMenuItem>
          ) : null}
          {isAdmin && isArchived ? <DropdownMenuItem disabled>{t("sales.actions.archived")}</DropdownMenuItem> : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialogs}
    </>
  );
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
  const names = saleClientNames(sale);
  const clientTitle = names.length > 0 ? names.join(", ") : t("sales.card.unknownClient");
  const extraClients = Math.max(0, names.length - 1);
  const contractValue = getSaleContractValue(sale);
  const netContractValue = getSaleNetContractValue(sale);
  const commissionValue = getSaleCommissionValue(sale);
  const payments = paymentCell(sale);
  const subscriptionProgress = getSubscriptionPaymentsProgress(sale);
  const sellerInfo = getSaleSellerInfo(sale);
  const sellerShort = isSelfServiceSale(sale) ? sellerInfo : sale.seller?.name?.trim() || sellerInfo;
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
  const meta = `${sellerInfo} · ${formatDate(sale.soldAt)}`;
  const metaVisible = `${sellerShort} · ${formatDate(sale.soldAt)}`;
  const nameId = `sale-name-${sale.id}`;
  const currency = sale.currency || "BRL";
  const showStripe = canMutate && !isArchived && hasStripePayment && !subscriptionCancelled && saleAllowsStripeCheckoutLink(sale);
  const showViewLink = hasPaymentLink && !subscriptionCancelled;
  const showCreateLink = canMutate && !hasPaymentLink && !isArchived && !subscriptionCancelled;
  const showWhatsapp = canMutate && !isArchived;
  const showEdit = canMutate && !isArchived;
  const dotClass = isArchived
    ? "bg-muted-foreground"
    : String(sale.status).toUpperCase() === "CONCLUDED"
      ? "bg-success"
      : "bg-warning";

  return (
    <>
      <article
        aria-labelledby={nameId}
        className={cn(
          "sale-card rounded-md bg-card p-4 shadow-[0_1px_2px_rgba(36,56,79,0.06),0_4px_12px_rgba(36,56,79,0.06)]",
          isArchived && "opacity-[.72]",
        )}
      >
        <div className="sale-card-head grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
          <h2 id={nameId} title={productName} className="line-clamp-2 min-w-0 text-base font-semibold leading-snug">
            {productName}
          </h2>
          {hideStatus ? <span /> : (
            <p className="flex items-center gap-1.5 self-start whitespace-nowrap pt-0.5 text-xs font-semibold">
              <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} aria-hidden="true" />
              {statusLabel}
            </p>
          )}
          <p title={meta} className="col-span-2 truncate text-[13px] text-muted-foreground">
            {metaVisible}
          </p>
        </div>
        <p title={clientTitle} className="sale-card-clients flex min-w-0 items-baseline gap-1 text-[13px] text-foreground">
          <span className="min-w-0 truncate">{names[0] ?? clientTitle}</span>
          {extraClients > 0 ? <span className="shrink-0 tabular-nums">+{extraClients}</span> : null}
        </p>

        <div className="sale-card-nums">
          <NumberCell label={t("sales.card.clients")} value={String(sale.clients?.length ?? 0)} />
          <div className="min-w-0">
            <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{t("sales.card.payments")}</p>
            <p className="overflow-hidden text-ellipsis text-sm font-semibold tabular-nums whitespace-nowrap">{payments.value}</p>
            {payments.ratio != null ? (
              <div className="my-1 h-1 overflow-hidden rounded-sm bg-border" aria-hidden="true">
                <span
                  className={cn("block h-full", payments.settled ? "bg-success" : "bg-primary")}
                  style={{ width: `${payments.ratio}%` }}
                />
              </div>
            ) : null}
            {payments.note ? <p className="whitespace-nowrap text-xs text-muted-foreground">{payments.note}</p> : null}
          </div>
          <NumberCell label={t("sales.card.contract")} value={formatCurrency(contractValue, currency)} />
          <NumberCell label={t("sales.card.netCommission")} value={formatCurrency(netContractValue, currency)}>
            <p className="whitespace-nowrap text-xs text-muted-foreground">
              {t("sales.card.commissionValue", { value: formatCurrency(commissionValue, "BRL") })}
            </p>
          </NumberCell>
        </div>

        <div className="sale-card-acts">
          {showStripe ? (
            <Button
              type="button"
              variant="success"
              className={MAIN_BUTTON}
              title={t("sales.actions.stripeTitle")}
              aria-label={t("sales.actions.stripeName")}
              onClick={() => setStripeOpen(true)}
            >
              <StripeMark className="h-3.5 w-3.5" />
              <span>{t("sales.actions.stripe")}</span>
            </Button>
          ) : null}
          {showViewLink || showCreateLink ? (
            <div className={cn("sale-split inline-flex", hasHotmartCheckout && "pr-0")}>
              {showViewLink ? (
                <Button
                  type="button"
                  variant="outline"
                  className={cn(MAIN_BUTTON, hasHotmartCheckout && "rounded-r-none")}
                  title={t("sales.actions.viewLinkTitle")}
                  aria-label={t("sales.actions.viewLink")}
                  onClick={() => setViewLinkOpen(true)}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("sales.actions.viewLink")}</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className={cn(MAIN_BUTTON, hasHotmartCheckout && "rounded-r-none")}
                  disabled={!hasPayments}
                  aria-label={t("sales.actions.paymentLink")}
                  title={hasPayments ? t("sales.actions.createLinkTitle") : t("sales.actions.noPayments")}
                  onClick={() => setCreateLinkOpen(true)}
                >
                  <LinkIcon className="h-4 w-4" aria-hidden="true" />
                  <span className="sale-link-long">{t("sales.actions.paymentLink")}</span>
                  <span className="sale-link-short">{t("sales.actions.paymentLinkShort")}</span>
                </Button>
              )}
              {hasHotmartCheckout ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="sale-icon-btn h-9 w-9 rounded-l-none border-l-0 px-0"
                      aria-label={t("sales.actions.otherLinks")}
                      title={t("sales.actions.otherLinks")}
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[180px] rounded-md p-1.5 shadow-lg">
                    <DropdownMenuItem
                      aria-label={t("sales.actions.hotmartOpen")}
                      onSelect={() => setHotmartOpen(true)}
                    >
                      {t("sales.actions.hotmart")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          ) : hasHotmartCheckout ? (
            <Button
              type="button"
              variant="outline"
              className={MAIN_BUTTON}
              aria-label={t("sales.actions.hotmartOpen")}
              title={t("sales.actions.hotmart")}
              onClick={() => setHotmartOpen(true)}
            >
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
              {t("sales.actions.hotmart")}
            </Button>
          ) : null}
          {showWhatsapp ? (
            <Button
              type="button"
              variant="outline"
              className="sale-icon-btn h-9 w-9 px-0"
              disabled={!hasPaymentLink}
              aria-label={t("sales.actions.whatsapp")}
              title={hasPaymentLink ? t("sales.actions.whatsappReady") : t("sales.actions.whatsappMissing")}
              onClick={() => setWhatsappOpen(true)}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
          <span className="sale-card-spacer flex-1" />
          <Button asChild variant="ghost" className="h-9 px-1.5 text-[13px] font-semibold text-primary underline underline-offset-[3px]">
            <Link to={`/vendas/${sale.id}`}>{t("sales.actions.details")}</Link>
          </Button>
          <SaleMoreMenu sale={sale} canEdit={showEdit} isAdmin={isAdmin} />
        </div>
      </article>

      <CreatePaymentLinkDialog sale={sale} open={createLinkOpen} onOpenChange={setCreateLinkOpen} />
      <ViewPaymentLinkDialog sale={sale} open={viewLinkOpen} onOpenChange={setViewLinkOpen} />
      <SendPaymentLinkDialog sale={sale} open={whatsappOpen} onOpenChange={setWhatsappOpen} />
      <StripeCheckoutLinkDialog sale={sale} open={stripeOpen} onOpenChange={setStripeOpen} />
      <HotmartCheckoutLinkDialog sale={sale} open={hotmartOpen} onOpenChange={setHotmartOpen} />
    </>
  );
};

export default SaleListCard;
