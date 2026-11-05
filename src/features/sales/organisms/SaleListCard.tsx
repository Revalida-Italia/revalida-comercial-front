import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { SaleRecord } from "@/services/commercialApi";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import StripeMark from "@/components/icons/StripeMark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t, tCount } from "@/i18n";
import { cn } from "@/lib/utils";
import { hasRole, getProfile } from "@/lib/session";
import { canMutateSales } from "@/services/usersApi";
import {
  Archive,
  Calendar,
  ChevronDown,
  Eye,
  FileText,
  GraduationCap,
  Link as LinkIcon,
  MessageCircle,
  Pencil,
  Trash2,
  UserRound,
  Users,
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
import { productTileInitials } from "@/features/sales/utils/productTile";
import CreatePaymentLinkDialog from "./CreatePaymentLinkDialog";
import { HotmartCheckoutLinkDialog } from "./HotmartCheckoutLink";
import SendPaymentLinkDialog from "./SendPaymentLinkDialog";
import StripeCheckoutLinkDialog from "./StripeCheckoutLinkDialog";
import { useSaleArchiveDelete } from "./SaleArchiveDeleteActions";
import ViewPaymentLinkDialog from "./ViewPaymentLinkDialog";

type SaleListCardProps = {
  sale: SaleRecord;
};

type NoteTone = "pending" | "paid" | "neutral";

type PaymentCellModel = {
  value: string;
  ratio: number;
  settled: boolean;
  note: string | null;
  noteTone: NoteTone;
};

function statusKind(status: string): "pending" | "paid" | "neutral" {
  const value = status.toUpperCase();
  if (value === "PENDING" || value === "OVERDUE") return "pending";
  if (value === "PAID" || value === "PAGA" || value === "CONCLUDED" || value === "ACTIVE") return "paid";
  return "neutral";
}

function progressNote(kind: "installment" | "subscription", progress: SalePaymentsProgress, cancelled: boolean) {
  if (progress.pending > 0) return tCount("sales.card.pending", progress.pending);
  if (cancelled) {
    return t(kind === "subscription" ? "sales.card.subscriptionCancelled" : "sales.card.installmentCancelled");
  }
  return t(kind === "subscription" ? "sales.card.subscriptionSettled" : "sales.card.installmentSettled");
}

function paymentCell(sale: SaleRecord): PaymentCellModel {
  const installments = getInstallmentPaymentsProgress(sale);
  const subscription = getSubscriptionPaymentsProgress(sale);
  const summary = sale.financialSummary?.payments;

  const fromProgress = (
    progress: SalePaymentsProgress,
    kind: "installment" | "subscription",
    cancelled: boolean,
  ): PaymentCellModel => {
    const noteTone: NoteTone = progress.pending > 0 ? "pending" : cancelled ? "neutral" : "paid";
    return {
      value: t("sales.card.paidShort", { paid: progress.paid, total: progress.total }),
      ratio: progress.total > 0 ? (progress.paid / progress.total) * 100 : 0,
      settled: progress.pending === 0 && !cancelled && progress.total > 0,
      note: progress.total > 0 ? progressNote(kind, progress, cancelled) : null,
      noteTone,
    };
  };

  if (installments) {
    const cancelled = installments.pending === 0 && saleHasCancelledPayments(sale, "INSTALLMENT");
    return fromProgress(installments, "installment", cancelled);
  }
  if (subscription) {
    const cancelled = subscription.pending === 0 && saleHasCancelledPayments(sale, "SUBSCRIPTION");
    return fromProgress(subscription, "subscription", cancelled);
  }
  if (summary?.installmentTotal && summary.installmentTotal > 0) {
    const paid = summary.installmentPaid ?? 0;
    const total = summary.installmentTotal;
    const pending = summary.installmentPending ?? Math.max(0, total - paid);
    return fromProgress({ paid, total, pending }, "installment", false);
  }
  if (summary && summary.subscriptionTotal > 0) {
    return fromProgress(
      { paid: summary.subscriptionPaid, total: summary.subscriptionTotal, pending: summary.subscriptionPending },
      "subscription",
      false,
    );
  }
  if (summary && summary.total > 0) {
    return fromProgress(
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
    return fromProgress(progress, "installment", progress.pending === 0 && saleHasCancelledPayments(sale));
  }
  return {
    value: t("sales.card.paidShort", { paid: 0, total: 0 }),
    ratio: 0,
    settled: false,
    note: null,
    noteTone: "neutral",
  };
}

function NumberCell({ label, value, children, valueClass }: { label: string; value: string; children?: ReactNode; valueClass?: string }) {
  return (
    <div className="sale-cell">
      <p className="sale-lbl">{label}</p>
      <p className={valueClass ?? "sale-val sale-val-lg"}>{value}</p>
      {children}
    </div>
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
  const archiveActions = useSaleArchiveDelete(sale);
  const names = saleClientNames(sale);
  const clientTitle = names.length > 0 ? names.join(", ") : t("sales.card.unknownClient");
  const extraClients = Math.max(0, names.length - 1);
  const contractValue = getSaleContractValue(sale);
  const netContractValue = getSaleNetContractValue(sale);
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
  const initials = productTileInitials(productName);
  const nameId = `sale-name-${sale.id}`;
  const currency = sale.currency || "BRL";
  const soldOn = formatDate(sale.soldAt);
  const showStripe = canMutate && !isArchived && hasStripePayment && !subscriptionCancelled && saleAllowsStripeCheckoutLink(sale);
  const showViewLink = hasPaymentLink && !subscriptionCancelled;
  const showCreateLink = canMutate && !hasPaymentLink && !isArchived && !subscriptionCancelled;
  const showPrimaryLink = showViewLink || showCreateLink;
  const showWhatsapp = canMutate && !isArchived;
  const showEdit = canMutate && !isArchived;
  const showArchive = isAdmin && !archiveActions.isArchived;
  const ringStyle = { "--p": `${Math.round(payments.ratio)}%` } as CSSProperties;

  return (
    <>
      <article
        aria-labelledby={nameId}
        className={cn("sale-card", isArchived && "is-archived")}
      >
        <div className="sale-card-id">
          <div className="sale-lead">
            <div className="sale-tile" aria-hidden="true">
              {initials ?? <GraduationCap className="h-[18px] w-[18px]" />}
            </div>
            <div className="sale-id-body">
              <h2 id={nameId} title={productName} className="sale-name">
                {productName}
              </h2>
              <div className="sale-meta">
                <span className="client" title={clientTitle}>
                  <Users className="sale-meta-icon" aria-hidden="true" />
                  <span className="client-name">{names[0] ?? clientTitle}</span>
                  {extraClients > 0 ? (
                    <span className="client-extra">{t("sales.card.clientsExtra", { count: extraClients })}</span>
                  ) : null}
                </span>
                <span className="seller" title={sellerName}>
                  <UserRound className="sale-meta-icon" aria-hidden="true" />
                  <span className="seller-name">{sellerName}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="sale-status-col">
            {hideStatus ? null : (
              <span className={cn("sale-badge", `is-${isArchived ? "neutral" : statusKind(sale.status)}`)}>
                <i aria-hidden="true" />
                {statusLabel}
              </span>
            )}
            <span className="date" title={soldOn}>
              <Calendar className="sale-meta-icon" aria-hidden="true" />
              <span className="date-text">{soldOn}</span>
            </span>
          </div>
        </div>

        <div className="sale-card-nums">
          <div className="sale-cell">
            <p className="sale-lbl">{t("sales.card.payments")}</p>
            <div className="sale-pay-row">
              <div
                className={cn("sale-ring", payments.settled && "is-done")}
                style={ringStyle}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="sale-val">{payments.value}</p>
                {payments.note ? (
                  <p className={cn("sale-sub", `is-${payments.noteTone}`)}>{payments.note}</p>
                ) : null}
              </div>
            </div>
          </div>
          <NumberCell label={t("sales.card.contract")} value={formatCurrency(contractValue, currency)} />
          <NumberCell label={t("sales.card.net")} value={formatCurrency(netContractValue, currency)} />
          <NumberCell
            label={t("sales.card.commission")}
            value={formatCurrency(commissionValue, "BRL")}
            valueClass="sale-comm"
          />
        </div>

        <div className="sale-card-acts">
          {showPrimaryLink ? (
            <div className={cn("sale-split", !hasHotmartCheckout && "is-solo")}>
              {showViewLink ? (
                <button
                  type="button"
                  className="sale-btn sale-btn-pay"
                  title={t("sales.actions.viewLinkTitle")}
                  aria-label={t("sales.actions.viewLink")}
                  onClick={() => setViewLinkOpen(true)}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("sales.actions.viewLink")}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={cn("sale-btn sale-btn-pay", !hasPayments && "is-disabled")}
                  aria-disabled={!hasPayments}
                  aria-label={t("sales.actions.paymentLink")}
                  title={hasPayments ? t("sales.actions.createLinkTitle") : t("sales.actions.noPayments")}
                  onClick={() => {
                    if (hasPayments) setCreateLinkOpen(true);
                  }}
                >
                  <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sale-link-long">{t("sales.actions.paymentLink")}</span>
                  <span className="sale-link-short">{t("sales.actions.paymentLinkShort")}</span>
                </button>
              )}
              {hasHotmartCheckout ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="sale-caret"
                      aria-label={t("sales.actions.otherLinks")}
                      title={t("sales.actions.otherLinks")}
                      aria-haspopup="menu"
                    >
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[180px] rounded-md p-1.5 shadow-lg">
                    <DropdownMenuItem
                      className="gap-2"
                      aria-label={t("sales.actions.hotmartOpen")}
                      onSelect={() => setHotmartOpen(true)}
                    >
                      <LinkIcon className="h-4 w-4" aria-hidden="true" />
                      {t("sales.actions.hotmart")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          ) : hasHotmartCheckout ? (
            <button
              type="button"
              className="sale-btn sale-btn-pay"
              aria-label={t("sales.actions.hotmartOpen")}
              title={t("sales.actions.hotmart")}
              onClick={() => setHotmartOpen(true)}
            >
              <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("sales.actions.hotmart")}</span>
            </button>
          ) : null}

          <div className="sale-acts-sec">
            {showStripe ? (
              <button
                type="button"
                className="sale-btn sale-icon-btn"
                title={t("sales.actions.stripeTitle")}
                aria-label={t("sales.actions.stripeName")}
                onClick={() => setStripeOpen(true)}
              >
                <StripeMark className="h-4 w-4" />
                <span className="sale-sec-label">{t("sales.actions.stripe")}</span>
              </button>
            ) : null}
            {showWhatsapp ? (
              <button
                type="button"
                className={cn("sale-btn sale-icon-btn sale-wa", !hasPaymentLink && "is-disabled")}
                aria-disabled={!hasPaymentLink}
                aria-label={t("sales.actions.whatsapp")}
                title={hasPaymentLink ? t("sales.actions.whatsappReady") : t("sales.actions.whatsappMissing")}
                onClick={() => {
                  if (hasPaymentLink) setWhatsappOpen(true);
                }}
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
            {showEdit ? (
              <Link
                to={`/vendas/${sale.id}/editar`}
                className="sale-btn sale-icon-btn"
                aria-label={t("sales.actions.edit")}
                title={t("sales.actions.edit")}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sale-sec-label">{t("sales.actions.edit")}</span>
              </Link>
            ) : null}
            <Link
              to={`/vendas/${sale.id}`}
              className="sale-btn sale-icon-btn"
              aria-label={t("sales.actions.details")}
              title={t("sales.actions.details")}
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sale-sec-label">{t("sales.actions.details")}</span>
            </Link>
            {showArchive ? (
              <button
                type="button"
                className="sale-btn sale-icon-btn"
                aria-label={t("sales.actions.archive")}
                title={t("sales.actions.archive")}
                onClick={archiveActions.openArchive}
              >
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sale-sec-label">{t("sales.actions.archive")}</span>
              </button>
            ) : null}
            {showArchive ? (
              <button
                type="button"
                className="sale-btn sale-icon-btn sale-danger text-[#9A3F3F]"
                aria-label={t("sales.actions.remove")}
                title={archiveActions.hasPaid ? t("sales.actions.removeBlocked") : t("sales.actions.removeReady")}
                onClick={() => {
                  if (!archiveActions.hasPaid) archiveActions.openDelete();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sale-sec-label">{t("sales.actions.remove")}</span>
              </button>
            ) : null}
          </div>
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
