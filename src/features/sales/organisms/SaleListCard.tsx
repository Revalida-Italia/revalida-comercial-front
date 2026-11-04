import { useState } from "react";
import { Link } from "react-router-dom";
import type { SaleRecord } from "@/services/commercialApi";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import { Badge } from "@/components/ui/badge";
import StripeMark from "@/components/icons/StripeMark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, CircleDollarSign, Eye, FileText, HandCoins, Link as LinkIcon, MessageCircle, Pencil, Users, UserCircle } from "lucide-react";
import { hasRole, getProfile } from "@/lib/session";
import { canMutateSales } from "@/services/usersApi";
import {
  formatSalePaymentsProgress,
  getInstallmentPaymentsProgress,
  getSaleCommissionValue,
  getSaleContractValue,
  getSaleNetContractValue,
  getSaleProductName,
  getSaleSellerInfo,
  getSubscriptionPaymentsProgress,
  saleAllowsStripeCheckoutLink,
  saleHasCancelledPayments,
  saleClientNames,
  saleStatusLabel,
} from "../utils";
import { saleHasPaymentLink } from "@/features/sales/utils/paymentLink";
import { saleOffersHotmartCheckout } from "@/features/sales/utils/hotmartCheckout";
import CreatePaymentLinkDialog from "./CreatePaymentLinkDialog";
import { HotmartCheckoutLinkDialog } from "./HotmartCheckoutLink";
import SendPaymentLinkDialog from "./SendPaymentLinkDialog";
import StripeCheckoutLinkDialog from "./StripeCheckoutLinkDialog";
import SaleArchiveDeleteActions from "./SaleArchiveDeleteActions";
import ViewPaymentLinkDialog from "./ViewPaymentLinkDialog";

type SaleListCardProps = {
  sale: SaleRecord;
};

const ACTION_LABEL = "sr-only sm:not-sr-only sm:whitespace-nowrap";
const ACTION_BUTTON = "h-7 shrink-0 gap-1 px-1.5 text-[11px] sm:px-2";

function ClientNames({ names, muted, icon }: { names: string[]; muted?: boolean; icon?: boolean }) {
  const full = names.length > 0 ? names.join(", ") : "Cliente não informado";
  return (
    <p
      title={full}
      className={`flex min-w-0 items-center gap-1 text-xs ${muted ? "text-muted-foreground" : "font-medium text-foreground"}`}
    >
      {icon ? <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
      <span className="min-w-0 flex-1 truncate">{full}</span>
      {names.length > 1 ? <span className="shrink-0 tabular-nums">{names.length}</span> : null}
    </p>
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
  const customerNames = saleClientNames(sale);
  const contractValue = getSaleContractValue(sale);
  const netContractValue = getSaleNetContractValue(sale);
  const commissionValue = getSaleCommissionValue(sale);
  const paymentsProgress = formatSalePaymentsProgress(sale);
  const subscriptionProgress = getSubscriptionPaymentsProgress(sale);
  const installmentProgress = getInstallmentPaymentsProgress(sale);
  const sellerInfo = getSaleSellerInfo(sale);
  const hasPaymentLink = saleHasPaymentLink(sale);
  const hasPayments = (sale.payments?.length ?? 0) > 0;
  const hasStripePayment = sale.payments?.some((payment) => payment.gateway === "STRIPE") ?? false;
  const hasHotmartCheckout = saleOffersHotmartCheckout(sale);
  const isArchived = String(sale.status).toUpperCase() === "ARCHIVED";
  const subscriptionCancelled =
    subscriptionProgress != null
    && subscriptionProgress.pending === 0
    && saleHasCancelledPayments(sale, "SUBSCRIPTION");
  const subscriptionSummary = sale.financialSummary?.payments;

  return (
    <>
      <Card className="border-border/70 transition-all hover:border-primary/40 hover:shadow-md">
        <CardContent className="p-3.5">
          <div className="grid min-w-0 gap-x-3 gap-y-2 md:grid-cols-[minmax(0,1.25fr)_repeat(5,minmax(0,1fr))_minmax(0,auto)] md:items-start">
            <Link
              to={`/vendas/${sale.id}`}
              className="space-y-0.5 min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <p className="truncate text-sm font-semibold text-foreground">{getSaleProductName(sale)}</p>
              <ClientNames names={customerNames} muted icon />
              <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
                <UserCircle className="h-3.5 w-3.5" />
                {sellerInfo}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(sale.soldAt)}
              </p>
            </Link>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Clientes</p>
              <ClientNames names={customerNames} />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pagamentos</p>
              <p className="text-xs font-medium">{paymentsProgress}</p>
              {subscriptionProgress ? (
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  {subscriptionProgress.pending > 0
                    ? `${subscriptionProgress.pending} parcela(s) pendente(s)`
                    : saleHasCancelledPayments(sale, "SUBSCRIPTION")
                      ? "Assinatura cancelada"
                      : "Assinatura quitada"}
                </p>
              ) : installmentProgress ? (
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  {installmentProgress.pending > 0
                    ? `${installmentProgress.pending} parcela(s) pendente(s)`
                    : saleHasCancelledPayments(sale, "INSTALLMENT")
                      ? "Parcelamento cancelado"
                      : "Parcelamento quitado"}
                </p>
              ) : subscriptionSummary && subscriptionSummary.subscriptionTotal > 0 ? (
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  {subscriptionSummary.subscriptionPending > 0
                    ? `${subscriptionSummary.subscriptionPending} parcela(s) pendente(s)`
                    : "Assinatura quitada"}
                </p>
              ) : subscriptionSummary && (subscriptionSummary.installmentTotal ?? 0) > 0 ? (
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  {(subscriptionSummary.installmentPending ?? 0) > 0
                    ? `${subscriptionSummary.installmentPending} parcela(s) pendente(s)`
                    : "Parcelamento quitado"}
                </p>
              ) : null}
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Contrato</p>
              <p className="text-xs font-semibold flex items-center gap-1">
                <CircleDollarSign className="h-3.5 w-3.5" />
                {formatCurrency(contractValue, sale.currency || "BRL")}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Líquido contrato</p>
              <p className="text-xs font-semibold flex items-center gap-1 text-sky-700" title="Bruto − taxas gateway (antes da comissão)">
                <HandCoins className="h-3.5 w-3.5" />
                {formatCurrency(netContractValue, sale.currency || "BRL")}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Comissão total</p>
              <p className="text-xs font-semibold text-primary">{formatCurrency(commissionValue, "BRL")}</p>
            </div>

            <div className="flex min-w-0 flex-col items-stretch justify-end gap-2 sm:items-end">
              {!(subscriptionCancelled && saleStatusLabel(sale.status) === "Pendente") && (
                <Badge
                  variant="outline"
                  className={`h-6 px-2 text-[10px] ${isArchived ? "border-amber-500/40 text-amber-700" : ""}`}
                >
                  {saleStatusLabel(sale.status)}
                </Badge>
              )}
              <div className="flex max-w-full flex-wrap items-center justify-end gap-1">
                {canMutate && !isArchived && hasStripePayment && !subscriptionCancelled && saleAllowsStripeCheckoutLink(sale) && (
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    className={ACTION_BUTTON}
                    title="Gerar ou atualizar o link de pagamento Stripe"
                    aria-label="Link de pagamento Stripe"
                    onClick={() => setStripeOpen(true)}
                  >
                    <StripeMark className="h-3.5 w-3.5" />
                    <span className={ACTION_LABEL}>Link Stripe</span>
                  </Button>
                )}
                {hasPaymentLink && !subscriptionCancelled && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={ACTION_BUTTON}
                    title="Ver link de pagamento"
                    aria-label="Ver link"
                    onClick={() => setViewLinkOpen(true)}
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className={ACTION_LABEL}>Ver link</span>
                  </Button>
                )}
                {canMutate && !hasPaymentLink && !isArchived && !subscriptionCancelled && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={ACTION_BUTTON}
                    disabled={!hasPayments}
                    aria-label="Link de pagamento"
                    title={hasPayments ? "Criar link de pagamento no Asaas" : "Venda sem pagamentos"}
                    onClick={() => setCreateLinkOpen(true)}
                  >
                    <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className={ACTION_LABEL}>Link de pagamento</span>
                  </Button>
                )}
                {hasHotmartCheckout && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={ACTION_BUTTON}
                    title="Link Hotmart desta venda"
                    aria-label="Abrir link Hotmart desta venda"
                    onClick={() => setHotmartOpen(true)}
                  >
                    <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className={ACTION_LABEL}>Link Hotmart</span>
                  </Button>
                )}
                {canMutate && !isArchived && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={ACTION_BUTTON}
                    disabled={!hasPaymentLink}
                    aria-label="WhatsApp"
                    title={hasPaymentLink ? "Enviar link no WhatsApp" : "Venda sem link de pagamento"}
                    onClick={() => setWhatsappOpen(true)}
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className={ACTION_LABEL}>WhatsApp</span>
                  </Button>
                )}
                {canMutate && !isArchived && (
                  <Button asChild variant="ghost" size="sm" className={`${ACTION_BUTTON} text-primary`}>
                    <Link to={`/vendas/${sale.id}/editar`} aria-label="Editar" title="Editar">
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className={ACTION_LABEL}>Editar</span>
                    </Link>
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm" className={`${ACTION_BUTTON} text-primary`}>
                  <Link to={`/vendas/${sale.id}`} aria-label="Detalhes" title="Detalhes">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className={ACTION_LABEL}>Detalhes</span>
                  </Link>
                </Button>
                {isAdmin && <SaleArchiveDeleteActions sale={sale} />}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CreatePaymentLinkDialog sale={sale} open={createLinkOpen} onOpenChange={setCreateLinkOpen} />
      <ViewPaymentLinkDialog sale={sale} open={viewLinkOpen} onOpenChange={setViewLinkOpen} />
      <SendPaymentLinkDialog sale={sale} open={whatsappOpen} onOpenChange={setWhatsappOpen} />
      <StripeCheckoutLinkDialog sale={sale} open={stripeOpen} onOpenChange={setStripeOpen} />
      <HotmartCheckoutLinkDialog sale={sale} open={hotmartOpen} onOpenChange={setHotmartOpen} />
    </>
  );
};

export default SaleListCard;
