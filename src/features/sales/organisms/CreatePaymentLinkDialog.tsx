import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { createPaymentLinkForSale, getSaleById, type SaleRecord } from "@/services/commercialApi";
import { PAYMENT_TYPE_LABELS } from "@/features/new-sale/constants";
import {
  getDefaultPaymentWithoutLink,
  getHotmartFixedLinkFromSale,
  getHotmartProductNameFromSale,
} from "@/features/sales/utils/paymentLink";

type CreatePaymentLinkDialogProps = {
  sale: SaleRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CreatePaymentLinkDialog = ({ sale, open, onOpenChange }: CreatePaymentLinkDialogProps) => {
  const queryClient = useQueryClient();

  const saleQuery = useQuery({
    queryKey: ["sale", sale.id],
    queryFn: () => getSaleById(sale.id),
    enabled: open,
  });

  const saleData = saleQuery.data ?? sale;
  const hotmartFixedLink = useMemo(() => getHotmartFixedLinkFromSale(saleData), [saleData]);
  const hotmartProductName = useMemo(() => getHotmartProductNameFromSale(saleData), [saleData]);
  const defaultPayment = useMemo(
    () => getDefaultPaymentWithoutLink(saleData.payments ?? []),
    [saleData.payments],
  );

  const [paymentId, setPaymentId] = useState(defaultPayment?.id ?? "");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setGeneratedLink(null);
      return;
    }

    const payment = getDefaultPaymentWithoutLink(saleData.payments ?? []);
    setPaymentId(payment?.id ?? "");
  }, [open, saleData.payments]);

  const createLinkMutation = useMutation({
    mutationFn: async () => {
      if (!paymentId) {
        throw new Error("Selecione um pagamento.");
      }

      if (!hotmartFixedLink) {
        throw new Error("Produto da venda não possui link fixo da Hotmart cadastrado.");
      }

      return createPaymentLinkForSale(sale.id, paymentId, hotmartFixedLink);
    },
    onSuccess: async (updatedSale) => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["sale", sale.id] });

      const updatedPayment = updatedSale.payments.find((payment) => payment.id === paymentId);
      const link = updatedPayment?.linkPagamento ?? hotmartFixedLink;
      setGeneratedLink(link);
      toast.success("Link Hotmart aplicado na venda.");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao aplicar link Hotmart.");
    },
  });

  const selectedPayment = saleData.payments?.find((payment) => payment.id === paymentId);
  const canApply = Boolean(hotmartFixedLink && paymentId && !selectedPayment?.linkPagamento);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Hotmart
          </DialogTitle>
          <DialogDescription>
            A Hotmart usa link fixo do produto. O pagamento será atualizado para gateway Hotmart com esse link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5 rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Link fixo do produto</p>
            {saleQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando produto...</p>
            ) : hotmartFixedLink ? (
              <>
                {hotmartProductName && (
                  <p className="text-sm font-medium">{hotmartProductName}</p>
                )}
                <p className="break-all text-sm text-foreground">{hotmartFixedLink}</p>
              </>
            ) : (
              <p className="text-sm text-destructive">
                Este produto não tem link fixo da Hotmart cadastrado.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Pagamento *</Label>
            <Select value={paymentId} onValueChange={setPaymentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o pagamento" />
              </SelectTrigger>
              <SelectContent>
                {(saleData.payments ?? []).map((payment) => (
                  <SelectItem key={payment.id} value={payment.id}>
                    {payment.gateway} · {PAYMENT_TYPE_LABELS[payment.type] ?? payment.type} · R$ {payment.amount}
                    {payment.linkPagamento ? " (já tem link)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(generatedLink || hotmartFixedLink) && (
            <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                {generatedLink ? "Link aplicado" : "Prévia do link"}
              </p>
              <p className="break-all text-sm">{generatedLink ?? hotmartFixedLink}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                  <a href={generatedLink ?? hotmartFixedLink!} target="_blank" rel="noopener noreferrer">
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
                    void navigator.clipboard.writeText(generatedLink ?? hotmartFixedLink!);
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {generatedLink ? "Fechar" : "Cancelar"}
          </Button>
          {!generatedLink && (
            <Button
              onClick={() => createLinkMutation.mutate()}
              disabled={createLinkMutation.isPending || !canApply}
            >
              {createLinkMutation.isPending ? "Aplicando..." : "Aplicar link Hotmart"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePaymentLinkDialog;
