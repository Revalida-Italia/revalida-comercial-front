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
import {
  getSuggestedHotmartLinkForSale,
  HOTMART_FIXED_LINKS,
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
  const suggestedLink = useMemo(() => getSuggestedHotmartLinkForSale(saleData), [saleData]);

  const [selectedLinkUrl, setSelectedLinkUrl] = useState(HOTMART_FIXED_LINKS[0]?.url ?? "");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setGeneratedLink(null);
      return;
    }

    setSelectedLinkUrl(suggestedLink?.url ?? HOTMART_FIXED_LINKS[0]?.url ?? "");
  }, [open, suggestedLink?.url]);

  const selectedLink = HOTMART_FIXED_LINKS.find((option) => option.url === selectedLinkUrl);
  const targetPayment = (saleData.payments ?? []).find((payment) => !payment.linkPagamento)
    ?? saleData.payments?.[0];

  const createLinkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLinkUrl) {
        throw new Error("Selecione um link Hotmart.");
      }

      if (!targetPayment?.id) {
        throw new Error("Venda sem pagamento para aplicar o link.");
      }

      if (targetPayment.linkPagamento) {
        throw new Error("Esta venda já possui link de pagamento.");
      }

      return createPaymentLinkForSale(sale.id, targetPayment.id, selectedLinkUrl);
    },
    onSuccess: async (updatedSale) => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["sale", sale.id] });

      const updatedPayment = updatedSale.payments.find((payment) => payment.id === targetPayment?.id);
      const link = updatedPayment?.linkPagamento ?? selectedLinkUrl;
      setGeneratedLink(link);
      toast.success("Link Hotmart aplicado na venda.");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao aplicar link Hotmart.");
    },
  });

  const previewLink = generatedLink ?? selectedLinkUrl;
  const canApply = Boolean(selectedLinkUrl && targetPayment && !targetPayment.linkPagamento);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Hotmart
          </DialogTitle>
          <DialogDescription>
            Escolha o link fixo do produto Hotmart. O pagamento da venda será atualizado com esse link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Produto Hotmart *</Label>
            <Select value={selectedLinkUrl} onValueChange={setSelectedLinkUrl}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {HOTMART_FIXED_LINKS.map((option) => (
                  <SelectItem key={option.url} value={option.url}>
                    {option.productName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {suggestedLink && suggestedLink.url === selectedLinkUrl && (
              <p className="text-xs text-muted-foreground">
                Sugestão baseada no produto da venda.
              </p>
            )}
          </div>

          {selectedLink && (
            <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                {generatedLink ? "Link aplicado" : "Link selecionado"}
              </p>
              <p className="text-sm font-medium">{selectedLink.productName}</p>
              <p className="break-all text-sm">{previewLink}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                  <a href={previewLink} target="_blank" rel="noopener noreferrer">
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
                    void navigator.clipboard.writeText(previewLink);
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
