import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BillingCalendarEvent } from "@/features/billing-calendar/types";
import {
  billingStatusColor,
  billingStatusLabel,
  normalizeBillingStatus,
} from "@/features/billing-calendar/utils";
import { formatCurrency } from "@/shared/utils/format";
import {
  CalendarDays,
  CircleCheck,
  Clock3,
  CreditCard,
  ExternalLink,
  Loader2,
  ShoppingBag,
  Tag,
  User,
} from "lucide-react";

type BillingEventDetailsDialogProps = {
  open: boolean;
  event: BillingCalendarEvent | null;
  canManageStatus?: boolean;
  isUpdatingStatus?: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkPaid?: () => void;
  onMarkPending?: () => void;
};

function formatEventDate(dateIso?: string | null): string {
  if (!dateIso) {
    return "-";
  }

  const rawDate = dateIso.slice(0, 10);
  const [year, month, day] = rawDate.split("-");

  if (!year || !month || !day) {
    return rawDate;
  }

  return `${day}/${month}/${year}`;
}

const BillingEventDetailsDialog = ({
  open,
  event,
  canManageStatus = false,
  isUpdatingStatus = false,
  onOpenChange,
  onMarkPaid,
  onMarkPending,
}: BillingEventDetailsDialogProps) => {
  const navigate = useNavigate();
  const saleId = event?.saleId || event?.sale?.id || "";
  const installmentLabel =
    event?.installmentNumber != null && event?.totalInstallments != null
      ? `${event.installmentNumber}/${event.totalInstallments}`
      : null;
  const normalizedStatus = normalizeBillingStatus(event?.status);
  const isPaid = normalizedStatus === "PAID";

  const handleGoToSale = () => {
    if (!saleId) {
      return;
    }

    onOpenChange(false);
    navigate(`/vendas/${saleId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes da cobranca</DialogTitle>
          <DialogDescription>
            {canManageStatus
              ? "Visualize e atualize o status de pagamento da cobranca."
              : "Visualizacao somente leitura da cobranca selecionada."}
          </DialogDescription>
        </DialogHeader>

        {!event ? (
          <p className="text-sm text-muted-foreground">Cobranca nao encontrada.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
              <p className="text-sm font-semibold">{event.title}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: billingStatusColor(event.status) }}
                />
                <span>{billingStatusLabel(event.status)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/80 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  Valor
                </div>
                <p className="mt-1 text-base font-semibold">{formatCurrency(event.amount)}</p>
              </div>

              <div className="rounded-lg border border-border/80 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Vencimento
                </div>
                <p className="mt-1 text-base font-semibold">{formatEventDate(event.scheduledDate)}</p>
              </div>

              <div className="rounded-lg border border-border/80 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" />
                  Gateway
                </div>
                <p className="mt-1 text-sm font-medium">{event.gateway || "-"}</p>
              </div>

              <div className="rounded-lg border border-border/80 p-3">
                <p className="text-xs text-muted-foreground">Parcela</p>
                <p className="mt-1 text-sm font-medium">{installmentLabel || "-"}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                Vendedor
              </div>
              <p className="mt-1 text-sm font-medium">
                {event.seller?.name || event.seller?.email || "-"}
              </p>
            </div>

            {event.paymentDate && (
              <div className="rounded-lg border border-border/80 p-3">
                <p className="text-xs text-muted-foreground">Data do pagamento</p>
                <p className="mt-1 text-sm font-medium">{formatEventDate(event.paymentDate)}</p>
              </div>
            )}

            {event.product?.name && (
              <div className="rounded-lg border border-border/80 p-3">
                <p className="text-xs text-muted-foreground">Produto</p>
                <p className="mt-1 text-sm font-medium">{event.product.name}</p>
              </div>
            )}

            {saleId ? (
              <div className="rounded-lg border border-border/80 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Venda relacionada
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-2 w-full gap-2"
                  disabled={isUpdatingStatus}
                  onClick={handleGoToSale}
                >
                  Ir para a venda
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}

            {event.linkPagamento && (
              <div className="rounded-lg border border-border/80 p-3">
                <p className="text-xs text-muted-foreground">Link de pagamento</p>
                <a
                  href={event.linkPagamento}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Abrir link
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {canManageStatus && (
              <div className="rounded-lg border border-border/80 bg-muted/10 p-3">
                <p className="text-xs font-medium text-muted-foreground">Status do pagamento</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {!isPaid ? (
                    <Button
                      type="button"
                      className="gap-2"
                      disabled={isUpdatingStatus}
                      onClick={onMarkPaid}
                    >
                      {isUpdatingStatus ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CircleCheck className="h-4 w-4" />
                      )}
                      Marcar como pago
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={isUpdatingStatus}
                      onClick={onMarkPending}
                    >
                      {isUpdatingStatus ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Clock3 className="h-4 w-4" />
                      )}
                      Marcar como pendente
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdatingStatus}>
            Fechar
          </Button>
          {saleId ? (
            <Button type="button" disabled={isUpdatingStatus} onClick={handleGoToSale}>
              Ver venda
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BillingEventDetailsDialog;
