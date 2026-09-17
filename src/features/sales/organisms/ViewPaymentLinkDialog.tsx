import { useEffect, useState } from "react";
import { Copy, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SaleRecord } from "@/services/commercialApi";
import {
  formatPaymentLinkLabel,
  getSalePaymentLinks,
} from "@/features/sales/utils/paymentLink";

type ViewPaymentLinkDialogProps = {
  sale: SaleRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ViewPaymentLinkDialog = ({ sale, open, onOpenChange }: ViewPaymentLinkDialogProps) => {
  const paymentLinks = getSalePaymentLinks(sale);
  const [selectedPaymentId, setSelectedPaymentId] = useState(paymentLinks[0]?.paymentId ?? "");

  useEffect(() => {
    if (!open) {
      return;
    }

    const links = getSalePaymentLinks(sale);
    setSelectedPaymentId(links[0]?.paymentId ?? "");
  }, [open, sale]);

  const selectedLink = paymentLinks.find((payment) => payment.paymentId === selectedPaymentId)
    ?? paymentLinks[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link de pagamento
          </DialogTitle>
          <DialogDescription>
            Visualize, copie ou abra o link vinculado a esta venda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {paymentLinks.length > 1 && (
            <div className="space-y-1.5">
              <Label>Pagamento</Label>
              <Select value={selectedPaymentId} onValueChange={setSelectedPaymentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {paymentLinks.map((payment) => (
                    <SelectItem key={payment.paymentId} value={payment.paymentId}>
                      {formatPaymentLinkLabel(payment)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedLink ? (
            <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                {formatPaymentLinkLabel(selectedLink)}
              </p>
              <p className="break-all text-sm">{selectedLink.linkPagamento}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                  <a href={selectedLink.linkPagamento} target="_blank" rel="noopener noreferrer">
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
                    void navigator.clipboard.writeText(selectedLink.linkPagamento);
                    toast.success("Link copiado.");
                  }}
                >
                  <Copy className="h-3 w-3" />
                  Copiar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum link de pagamento encontrado.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewPaymentLinkDialog;
