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
import {
  DEFAULT_SUBSCRIPTION_CYCLE,
  MAX_INSTALLMENTS,
  PAYMENT_TYPE_LABELS,
} from "@/features/new-sale/constants";
import type { SalePaymentDraft } from "@/features/new-sale/types";
import AsaasPaymentConfigForm from "@/features/sales/molecules/AsaasPaymentConfigForm";
import {
  createEmptyAsaasPaymentDraft,
  getDefaultPaymentWithoutLink,
  salePaymentToDraft,
} from "@/features/sales/utils/paymentLink";
import {
  createAsaasPaymentLinkForSale,
  getSaleById,
  listGatewayFees,
  type BillingType,
  type SaleRecord,
} from "@/services/commercialApi";

type CreatePaymentLinkDialogProps = {
  sale: SaleRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function isValidAsaasPaymentDraft(payment: SalePaymentDraft): payment is SalePaymentDraft & { billingType: BillingType } {
  const amountOk = Number(payment.amount) > 0;
  const baseOk = Boolean(
    payment.gateway === "ASAAS"
    && payment.paymentType
    && payment.dueDate
    && payment.billingType
    && amountOk,
  );

  if (!baseOk) {
    return false;
  }

  if (["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType)) {
    const installments = Number(payment.totalInstallments);
    return Number.isInteger(installments) && installments >= 1 && installments <= MAX_INSTALLMENTS;
  }

  return true;
}

const CreatePaymentLinkDialog = ({ sale, open, onOpenChange }: CreatePaymentLinkDialogProps) => {
  const queryClient = useQueryClient();

  const saleQuery = useQuery({
    queryKey: ["sale", sale.id],
    queryFn: () => getSaleById(sale.id),
    enabled: open,
  });

  const gatewayFeesQuery = useQuery({
    queryKey: ["gateway-fees"],
    queryFn: listGatewayFees,
    enabled: open,
  });

  const saleData = saleQuery.data ?? sale;
  const defaultPayment = useMemo(
    () => getDefaultPaymentWithoutLink(saleData.payments ?? []),
    [saleData.payments],
  );

  const [paymentId, setPaymentId] = useState(defaultPayment?.id ?? "");
  const [paymentDraft, setPaymentDraft] = useState<SalePaymentDraft>(createEmptyAsaasPaymentDraft());
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setGeneratedLink(null);
      return;
    }

    const payment = getDefaultPaymentWithoutLink(saleData.payments ?? []);
    setPaymentId(payment?.id ?? "");
    setPaymentDraft(payment ? salePaymentToDraft(payment) : createEmptyAsaasPaymentDraft());
  }, [open, saleData.payments]);

  const selectedPayment = saleData.payments?.find((payment) => payment.id === paymentId);
  const gatewayFees = gatewayFeesQuery.data ?? [];

  function getFeeRate(gateway: string, paymentType: string): number {
    const gatewayConfig = gatewayFees.find((item) => item.gateway === gateway);
    const option = gatewayConfig?.paymentOptions.find((item) => item.paymentType === paymentType);
    const feeRate = option?.feeRate;
    return feeRate !== undefined ? Number(feeRate) : 0;
  }

  function updatePaymentDraft(field: keyof SalePaymentDraft, value: string) {
    setPaymentDraft((prev) => {
      if (field === "paymentType") {
        return {
          ...prev,
          paymentType: value,
          totalInstallments: prev.totalInstallments || "1",
          ciclo: value === "SUBSCRIPTION" ? prev.ciclo || DEFAULT_SUBSCRIPTION_CYCLE : DEFAULT_SUBSCRIPTION_CYCLE,
        };
      }

      if (field === "totalInstallments") {
        return { ...prev, totalInstallments: value };
      }

      return { ...prev, [field]: value };
    });
  }

  function handlePaymentChange(nextPaymentId: string) {
    setPaymentId(nextPaymentId);
    const payment = saleData.payments?.find((item) => item.id === nextPaymentId);
    setPaymentDraft(payment ? salePaymentToDraft(payment) : createEmptyAsaasPaymentDraft());
  }

  const createLinkMutation = useMutation({
    mutationFn: async () => {
      if (!paymentId) {
        throw new Error("Selecione um pagamento.");
      }

      if (!isValidAsaasPaymentDraft(paymentDraft)) {
        throw new Error("Preencha todos os campos do pagamento Asaas.");
      }

      if (selectedPayment?.linkPagamento) {
        throw new Error("Este pagamento já possui link.");
      }

      return createAsaasPaymentLinkForSale(sale.id, paymentId, {
        type: paymentDraft.paymentType,
        amount: Number(paymentDraft.amount),
        billingType: paymentDraft.billingType,
        dueDate: paymentDraft.dueDate,
        ...(paymentDraft.paymentType === "SUBSCRIPTION"
          ? { ciclo: paymentDraft.ciclo || DEFAULT_SUBSCRIPTION_CYCLE }
          : {}),
        ...(["INSTALLMENT", "SUBSCRIPTION"].includes(paymentDraft.paymentType)
          ? { totalInstallments: Number(paymentDraft.totalInstallments || "1") }
          : {}),
      });
    },
    onSuccess: async (updatedSale) => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["sale", sale.id] });

      const updatedPayment = updatedSale.payments.find((payment) => payment.id === paymentId);
      const link = updatedPayment?.linkPagamento ?? null;
      setGeneratedLink(link);

      if (link) {
        toast.success("Link de pagamento Asaas criado com sucesso.");
      } else {
        toast.warning("Pagamento atualizado, mas o link ainda não foi retornado pela API.");
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao criar link de pagamento.");
    },
  });

  const feeRate = getFeeRate("ASAAS", paymentDraft.paymentType);
  const canSubmit = Boolean(
    paymentId
    && isValidAsaasPaymentDraft(paymentDraft)
    && !selectedPayment?.linkPagamento,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Criar link de pagamento
          </DialogTitle>
          <DialogDescription>
            Configure o pagamento no Asaas. O gateway será atualizado e o link será gerado pela API.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(saleData.payments?.length ?? 0) > 1 && (
            <div className="space-y-1.5">
              <Label>Pagamento da venda *</Label>
              <Select value={paymentId} onValueChange={handlePaymentChange}>
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
          )}

          <AsaasPaymentConfigForm
            payment={paymentDraft}
            currency={saleData.currency || "BRL"}
            gatewayFees={gatewayFees}
            gatewayFeesLoading={gatewayFeesQuery.isLoading}
            feeRate={feeRate}
            onUpdatePayment={updatePaymentDraft}
          />

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
              disabled={createLinkMutation.isPending || !canSubmit}
            >
              {createLinkMutation.isPending ? "Gerando..." : "Gerar link Asaas"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePaymentLinkDialog;
