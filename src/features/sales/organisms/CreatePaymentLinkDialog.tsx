import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  createPaymentLinkForSale,
  type PaymentLinkProvider,
  type SaleRecord,
} from "@/services/commercialApi";
import { PAYMENT_TYPE_LABELS } from "@/features/new-sale/constants";
import {
  getDefaultPaymentWithoutLink,
  PAYMENT_LINK_PROVIDER_OPTIONS,
} from "@/features/sales/utils/paymentLink";

type CreatePaymentLinkDialogProps = {
  sale: SaleRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CreatePaymentLinkDialog = ({ sale, open, onOpenChange }: CreatePaymentLinkDialogProps) => {
  const queryClient = useQueryClient();
  const defaultPayment = useMemo(() => getDefaultPaymentWithoutLink(sale.payments ?? []), [sale.payments]);

  const [paymentId, setPaymentId] = useState(defaultPayment?.id ?? "");
  const [provider, setProvider] = useState<PaymentLinkProvider>("ASAAS");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setGeneratedLink(null);
      return;
    }

    const payment = getDefaultPaymentWithoutLink(sale.payments ?? []);
    setPaymentId(payment?.id ?? "");
    setProvider("ASAAS");
  }, [open, sale.payments]);

  const createLinkMutation = useMutation({
    mutationFn: async () => {
      if (!paymentId) {
        throw new Error("Selecione um pagamento.");
      }

      return createPaymentLinkForSale(sale.id, paymentId, provider);
    },
    onSuccess: async (updatedSale) => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["sale", sale.id] });

      const updatedPayment = updatedSale.payments.find((payment) => payment.id === paymentId);
      const link = updatedPayment?.linkPagamento ?? null;
      setGeneratedLink(link);

      if (link) {
        toast.success("Link de pagamento criado com sucesso.");
      } else {
        toast.warning("Pagamento atualizado, mas o link ainda não foi retornado pela API.");
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao criar link de pagamento.");
    },
  });

  const selectedPayment = sale.payments?.find((payment) => payment.id === paymentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Criar link de pagamento
          </DialogTitle>
          <DialogDescription>
            Escolha o provedor do link. O gateway do pagamento será atualizado para Hotmart ou Asaas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Provedor do link *</Label>
            <Select value={provider} onValueChange={(value) => setProvider(value as PaymentLinkProvider)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_LINK_PROVIDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Pagamento *</Label>
            <Select value={paymentId} onValueChange={setPaymentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o pagamento" />
              </SelectTrigger>
              <SelectContent>
                {(sale.payments ?? []).map((payment) => (
                  <SelectItem key={payment.id} value={payment.id}>
                    {payment.gateway} · {PAYMENT_TYPE_LABELS[payment.type] ?? payment.type} · R$ {payment.amount}
                    {payment.linkPagamento ? " (já tem link)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPayment && (
              <p className="text-xs text-muted-foreground">
                Gateway atual: <strong>{selectedPayment.gateway}</strong>
                {selectedPayment.linkPagamento ? " · este pagamento já possui link" : ""}
              </p>
            )}
          </div>

          {generatedLink && (
            <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-medium text-muted-foreground">Link gerado</p>
              <p className="break-all text-sm">{generatedLink}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                  <a href={generatedLink} target="_blank" rel="noopener noreferrer">
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
                    void navigator.clipboard.writeText(generatedLink);
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
              disabled={createLinkMutation.isPending || !paymentId || Boolean(selectedPayment?.linkPagamento)}
            >
              {createLinkMutation.isPending ? "Gerando..." : "Criar link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePaymentLinkDialog;
