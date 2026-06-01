import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SalePayment, SaleRecord } from "@/services/commercialApi";
import { listWhatsappTemplates, sendPaymentLinkWhatsapp } from "@/services/whatsappApi";
import { getPrimaryClientName, getPrimaryClientPhone } from "@/features/sales/utils";

type SendPaymentLinkDialogProps = {
  sale: SaleRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getDefaultPayment(sale: SaleRecord): SalePayment | undefined {
  return sale.payments.find((payment) => payment.linkPagamento) ?? sale.payments[0];
}

const SendPaymentLinkDialog = ({ sale, open, onOpenChange }: SendPaymentLinkDialogProps) => {
  const defaultPayment = useMemo(() => getDefaultPayment(sale), [sale]);

  const [paymentId, setPaymentId] = useState(defaultPayment?.id ?? "");
  const [telefone, setTelefone] = useState(getPrimaryClientPhone(sale));
  const [templateName, setTemplateName] = useState("link_pagamento");
  const [bodyParam, setBodyParam] = useState(getPrimaryClientName(sale));

  const templatesQuery = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: listWhatsappTemplates,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const payment = getDefaultPayment(sale);
    setPaymentId(payment?.id ?? "");
    setTelefone(getPrimaryClientPhone(sale));
    setBodyParam(getPrimaryClientName(sale));
  }, [open, sale]);

  useEffect(() => {
    if (!templateName && templatesQuery.data?.length) {
      setTemplateName(templatesQuery.data[0].nome);
    }
  }, [templateName, templatesQuery.data]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!paymentId) {
        throw new Error("Selecione um pagamento.");
      }

      if (!telefone.trim()) {
        throw new Error("Informe o telefone do cliente.");
      }

      if (!templateName.trim()) {
        throw new Error("Selecione um template.");
      }

      if (!bodyParam.trim()) {
        throw new Error("Informe o nome para a mensagem.");
      }

      await sendPaymentLinkWhatsapp({
        paymentId,
        telefone: telefone.trim(),
        templateName: templateName.trim(),
        bodyParams: [bodyParam.trim()],
      });
    },
    onSuccess: () => {
      toast.success("Link de pagamento enviado no WhatsApp.");
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar link.");
    },
  });

  const selectedPayment = sale.payments.find((payment) => payment.id === paymentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Enviar link no WhatsApp
          </DialogTitle>
          <DialogDescription>
            O backend usa o pagamento da venda e envia o link Asaas pelo template escolhido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Pagamento *</Label>
            <Select value={paymentId} onValueChange={setPaymentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o pagamento" />
              </SelectTrigger>
              <SelectContent>
                {sale.payments.map((payment) => (
                  <SelectItem key={payment.id} value={payment.id}>
                    {payment.gateway} · {payment.type} · R$ {payment.amount}
                    {!payment.linkPagamento ? " (sem link)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPayment?.linkPagamento && (
              <p className="text-xs text-muted-foreground break-all">
                Link: {selectedPayment.linkPagamento}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Telefone *</Label>
            <Input
              type="tel"
              value={telefone}
              onChange={(event) => setTelefone(event.target.value)}
              placeholder="5534999999999"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Template *</Label>
            <Select value={templateName} onValueChange={setTemplateName}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o template" />
              </SelectTrigger>
              <SelectContent>
                {(templatesQuery.data ?? []).map((template) => (
                  <SelectItem key={template.id ?? template.nome} value={template.nome}>
                    {template.nome}
                  </SelectItem>
                ))}
                <SelectItem value="link_pagamento">link_pagamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nome na mensagem (parametro 1) *</Label>
            <Input
              value={bodyParam}
              onChange={(event) => setBodyParam(event.target.value)}
              placeholder="Nome do cliente"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || sale.payments.length === 0}
          >
            {sendMutation.isPending ? "Enviando..." : "Enviar WhatsApp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendPaymentLinkDialog;
