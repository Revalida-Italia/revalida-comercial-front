import { useEffect, useRef, useState } from "react";
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
import {
  DEFAULT_SUBSCRIPTION_CYCLE,
  MAX_INSTALLMENTS,
} from "@/features/new-sale/constants";
import type { SalePaymentDraft } from "@/features/new-sale/types";
import type { AssinaturaClientDraft } from "@/features/sales/utils/paymentLink";
import AsaasPaymentConfigForm from "@/features/sales/molecules/AsaasPaymentConfigForm";
import AssinaturaClientFields from "@/features/sales/molecules/AssinaturaClientFields";
import {
  createEmptyAsaasPaymentDraft,
  createEmptyAssinaturaClientDraft,
  getDefaultPaymentWithoutLink,
  isValidAssinaturaClientDraft,
  saleClientToDraft,
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
  const targetPayment = getDefaultPaymentWithoutLink(saleData.payments ?? []);

  const [paymentDraft, setPaymentDraft] = useState<SalePaymentDraft>(createEmptyAsaasPaymentDraft());
  const [clientDraft, setClientDraft] = useState<AssinaturaClientDraft>(createEmptyAssinaturaClientDraft());
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const initializedForOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setGeneratedLink(null);
      initializedForOpenRef.current = false;
      return;
    }

    if (initializedForOpenRef.current || saleQuery.isLoading) {
      return;
    }

    const currentSale = saleQuery.data ?? sale;
    const payment = getDefaultPaymentWithoutLink(currentSale.payments ?? []);

    if (payment) {
      const draft = salePaymentToDraft(payment);
      setPaymentDraft({
        ...draft,
        gateway: "ASAAS",
        paymentType: "SUBSCRIPTION",
      });
    } else {
      setPaymentDraft({
        ...createEmptyAsaasPaymentDraft(),
        paymentType: "SUBSCRIPTION",
      });
    }

    setClientDraft(saleClientToDraft(currentSale));

    initializedForOpenRef.current = true;
  }, [open, sale, saleQuery.data, saleQuery.isLoading]);
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

  function updateClientDraft(field: keyof AssinaturaClientDraft, value: string) {
    setClientDraft((prev) => ({ ...prev, [field]: value }));
  }

  const createLinkMutation = useMutation({
    mutationFn: async () => {
      if (!targetPayment?.id) {
        throw new Error("Venda sem pagamento disponível para gerar link.");
      }

      if (!isValidAsaasPaymentDraft(paymentDraft)) {
        throw new Error("Preencha todos os campos do pagamento Asaas.");
      }

      if (targetPayment.linkPagamento) {
        throw new Error("Esta venda já possui link de pagamento.");
      }

      return createAsaasPaymentLinkForSale(sale.id, targetPayment.id, {
        type: paymentDraft.paymentType,
        amount: Number(paymentDraft.amount),
        billingType: paymentDraft.billingType,
        dueDate: paymentDraft.dueDate,
        client: {
          nome: clientDraft.nome.trim(),
          cpf: clientDraft.cpf.trim(),
          telefone: clientDraft.telefone.trim(),
          ...(clientDraft.email.trim() ? { email: clientDraft.email.trim() } : {}),
        },
        ...(paymentDraft.paymentType === "SUBSCRIPTION"
          ? { ciclo: paymentDraft.ciclo || DEFAULT_SUBSCRIPTION_CYCLE }
          : {}),
        ...(["INSTALLMENT", "SUBSCRIPTION"].includes(paymentDraft.paymentType)
          ? { totalInstallments: Number(paymentDraft.totalInstallments || "1") }
          : {}),
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["sale", sale.id] });

      setGeneratedLink(result.linkPagamento);
      toast.success("Link de pagamento vinculado à venda com sucesso.");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao criar link de pagamento.");
    },
  });

  const feeRate = getFeeRate("ASAAS", paymentDraft.paymentType);
  const canSubmit = Boolean(
    targetPayment?.id
    && isValidAsaasPaymentDraft(paymentDraft)
    && isValidAssinaturaClientDraft(clientDraft)
    && !targetPayment.linkPagamento,
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
            Cria a assinatura no Asaas e vincula o link de pagamento nesta venda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <AssinaturaClientFields
            client={clientDraft}
            onUpdateClient={updateClientDraft}
          />

          <AsaasPaymentConfigForm
            payment={paymentDraft}
            currency={saleData.currency || "BRL"}
            gatewayFees={gatewayFees}
            gatewayFeesLoading={gatewayFeesQuery.isLoading}
            feeRate={feeRate}
            subscriptionOnly
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
              {createLinkMutation.isPending ? "Gerando..." : "Gerar link de assinatura"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePaymentLinkDialog;
