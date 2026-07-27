import { useState } from "react";
import { Link } from "react-router-dom";
import type { SaleRecord } from "@/services/commercialApi";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, CircleDollarSign, Eye, Link2, MessageCircle, Pencil, Users, UserCircle } from "lucide-react";
import { hasRole, getProfile } from "@/lib/session";
import { canMutateSales } from "@/services/usersApi";
import {
  getSaleCommissionValue,
  getSaleContractValue,
  getSaleCustomerNames,
  getSaleProductName,
  getSaleSellerInfo,
} from "../utils";
import { saleHasPaymentLink } from "@/features/sales/utils/paymentLink";
import CreatePaymentLinkDialog from "./CreatePaymentLinkDialog";
import SendPaymentLinkDialog from "./SendPaymentLinkDialog";
import SaleArchiveDeleteActions from "./SaleArchiveDeleteActions";
import ViewPaymentLinkDialog from "./ViewPaymentLinkDialog";

type SaleListCardProps = {
  sale: SaleRecord;
};

const SaleListCard = ({ sale }: SaleListCardProps) => {
  const profile = getProfile();
  const isAdmin = hasRole("ADMIN");
  const canMutate = canMutateSales(profile?.role);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [createLinkOpen, setCreateLinkOpen] = useState(false);
  const [viewLinkOpen, setViewLinkOpen] = useState(false);
  const customerNames = getSaleCustomerNames(sale);
  const contractValue = getSaleContractValue(sale);
  const commissionValue = getSaleCommissionValue(sale);
  const sellerInfo = getSaleSellerInfo(sale);
  const hasPaymentLink = saleHasPaymentLink(sale);
  const hasPayments = (sale.payments?.length ?? 0) > 0;
  const isArchived = String(sale.status).toUpperCase() === "ARCHIVED";

  return (
    <>
      <Card className="border-border/70 transition-all hover:border-primary/40 hover:shadow-md">
        <CardContent className="p-3.5">
          <div className="grid gap-x-3 gap-y-2 md:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))_auto] md:items-start">
            <Link
              to={`/vendas/${sale.id}`}
              className="space-y-0.5 min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <p className="truncate text-sm font-semibold text-foreground">{getSaleProductName(sale)}</p>
              <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {customerNames}
              </p>
              <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
                <UserCircle className="h-3.5 w-3.5" />
                {sellerInfo}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatDate(sale.soldAt)}
              </p>
            </Link>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Clientes</p>
              <p className="text-xs font-medium">{sale.clients?.length ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pagamentos</p>
              <p className="text-xs font-medium">{sale.payments?.length ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Contrato</p>
              <p className="text-xs font-semibold flex items-center gap-1">
                <CircleDollarSign className="h-3.5 w-3.5" />
                {formatCurrency(contractValue, sale.currency || "BRL")}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Comissao total</p>
              <p className="text-xs font-semibold text-primary">{formatCurrency(commissionValue, "BRL")}</p>
            </div>

            <div className="flex flex-col items-end justify-end gap-2">
              <Badge
                variant="outline"
                className={`h-6 px-2 text-[10px] ${isArchived ? "border-amber-500/40 text-amber-700" : ""}`}
              >
                {sale.status}
              </Badge>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {hasPaymentLink && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px]"
                    title="Ver link de pagamento"
                    onClick={() => setViewLinkOpen(true)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver link
                  </Button>
                )}
                {canMutate && !hasPaymentLink && !isArchived && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px]"
                    disabled={!hasPayments}
                    title={hasPayments ? "Criar link de pagamento no Asaas" : "Venda sem pagamentos"}
                    onClick={() => setCreateLinkOpen(true)}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Link de pagamento
                  </Button>
                )}
                {canMutate && !isArchived && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px]"
                    disabled={!hasPaymentLink}
                    title={hasPaymentLink ? "Enviar link no WhatsApp" : "Venda sem link de pagamento"}
                    onClick={() => setWhatsappOpen(true)}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </Button>
                )}
                {canMutate && !isArchived && (
                  <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-primary">
                    <Link to={`/vendas/${sale.id}/editar`}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Link>
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-primary">
                  <Link to={`/vendas/${sale.id}`}>Detalhes</Link>
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
    </>
  );
};

export default SaleListCard;
