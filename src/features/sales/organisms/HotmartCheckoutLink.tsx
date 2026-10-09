import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SendPaymentLinkDialog from "@/features/sales/organisms/SendPaymentLinkDialog";
import { saleOffersHotmartCheckout } from "@/features/sales/utils/hotmartCheckout";
import type { SaleRecord } from "@/services/commercialApi";
import { getHotmartCheckoutLink } from "@/services/paymentLinksApi";

type HotmartCheckoutLinkContentProps = {
  sale: SaleRecord;
  enabled?: boolean;
};

export function HotmartCheckoutLinkContent({ sale, enabled = true }: HotmartCheckoutLinkContentProps) {
  const [sendOpen, setSendOpen] = useState(false);
  const hotmartPayment = sale.payments?.find((payment) => payment.gateway === "HOTMART");
  const canSendPaymentLink = sale.payments?.some((payment) => Boolean(payment.linkPagamento)) ?? false;

  const linkQuery = useQuery({
    queryKey: ["hotmart-checkout-link", sale.id],
    queryFn: () => getHotmartCheckoutLink(sale.id),
    enabled: enabled && Boolean(sale.id),
  });

  const url = linkQuery.data?.url ?? sale.hotmartCheckoutLink ?? null;
  const errorMessage = linkQuery.isError
    ? (linkQuery.error instanceof Error ? linkQuery.error.message : "Erro ao carregar link Hotmart.")
    : null;

  async function copyLink() {
    if (!url) {
      return;
    }

    await navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  }

  return (
    <div className="space-y-3">
      {linkQuery.isLoading && !url && (
        <p className="text-sm text-muted-foreground">Carregando link Hotmart...</p>
      )}

      {errorMessage && !url && (
        <p role="alert" className="text-sm text-destructive">{errorMessage}</p>
      )}

      {errorMessage && url && (
        <p role="alert" className="text-xs text-destructive">{errorMessage}</p>
      )}

      {url && (
        <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-medium text-muted-foreground">Link desta venda</p>
          <p className="break-all text-sm">{url}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Abrir link Hotmart">
                <ExternalLink className="h-3 w-3" />
                Abrir
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              aria-label="Copiar link Hotmart"
              onClick={() => {
                void copyLink();
              }}
            >
              <Copy className="h-3 w-3" />
              Copiar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              aria-label="Enviar link Hotmart no WhatsApp"
              disabled={!canSendPaymentLink}
              title={canSendPaymentLink ? "Enviar link no WhatsApp" : "Nenhum pagamento com link para envio"}
              onClick={() => setSendOpen(true)}
            >
              Enviar no WhatsApp
            </Button>
          </div>
        </div>
      )}

      {!linkQuery.isLoading && !url && !errorMessage && (
        <p className="text-sm text-muted-foreground">Link Hotmart indisponível.</p>
      )}

      <SendPaymentLinkDialog
        sale={sale}
        open={sendOpen}
        onOpenChange={setSendOpen}
        initialPaymentId={hotmartPayment?.id}
      />
    </div>
  );
}

type HotmartCheckoutLinkCardProps = {
  sale: SaleRecord;
};

const HotmartCheckoutLinkCard = ({ sale }: HotmartCheckoutLinkCardProps) => {
  if (!saleOffersHotmartCheckout(sale)) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Link2 className="h-4 w-4" />
          Link Hotmart da venda
        </CardTitle>
        <CardDescription>
          Checkout Hotmart desta venda. O link inclui o identificador da venda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <HotmartCheckoutLinkContent sale={sale} />
      </CardContent>
    </Card>
  );
};

type HotmartCheckoutLinkDialogProps = {
  sale: SaleRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HotmartCheckoutLinkDialog({ sale, open, onOpenChange }: HotmartCheckoutLinkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Hotmart da venda
          </DialogTitle>
          <DialogDescription>
            Checkout Hotmart desta venda. O link inclui o identificador da venda.
          </DialogDescription>
        </DialogHeader>
        <HotmartCheckoutLinkContent sale={sale} enabled={open} />
      </DialogContent>
    </Dialog>
  );
}

export default HotmartCheckoutLinkCard;
