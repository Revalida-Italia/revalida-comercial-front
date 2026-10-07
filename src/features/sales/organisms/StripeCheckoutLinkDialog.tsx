import { useEffect, useMemo, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_TYPE_LABELS } from "@/features/new-sale/constants";
import SendPaymentLinkDialog from "@/features/sales/organisms/SendPaymentLinkDialog";
import type { SalePayment, SaleRecord } from "@/services/commercialApi";
import { createStripeCheckoutLink, type StripeCheckoutSession } from "@/services/paymentLinksApi";
import { formatCurrency, formatDateTime } from "@/shared/utils/format";
import {
  CHECKOUT_CURRENCIES,
  buildStripeCheckoutBody,
  isCheckoutCurrency,
  parseCheckoutAmount,
  stripeCheckoutMethodHint,
  type CheckoutCurrency,
} from "@/shared/utils/stripeCheckout";

const CURRENCY_LABELS: Record<CheckoutCurrency, string> = {
  BRL: "Real (BRL)",
  USD: "Dólar (USD)",
  EUR: "Euro (EUR)",
};

type StripeCheckoutLinkDialogProps = {
  sale: SaleRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId?: string;
};

function stripePaymentsOf(sale: SaleRecord): SalePayment[] {
  return (sale.payments ?? []).filter((payment) => payment.gateway === "STRIPE");
}

function paymentOptionLabel(payment: SalePayment): string {
  const currency = isCheckoutCurrency(payment.currency) ? payment.currency : "BRL";
  const amountLabel = currency !== "BRL" && payment.originalAmount != null
    ? formatCurrency(Number(payment.originalAmount) || 0, currency)
    : formatCurrency(Number(payment.amount) || 0, "BRL");

  const typeLabel = payment.type ? PAYMENT_TYPE_LABELS[payment.type] ?? payment.type : "";
  return [typeLabel, amountLabel].filter(Boolean).join(" · ");
}

function initialAmountInput(payment: SalePayment | undefined, currency: CheckoutCurrency): string {
  if (!payment || currency === "BRL" || payment.originalAmount == null) {
    return "";
  }

  return String(payment.originalAmount);
}

const StripeCheckoutLinkDialog = ({
  sale,
  open,
  onOpenChange,
  paymentId,
}: StripeCheckoutLinkDialogProps) => {
  const queryClient = useQueryClient();
  const stripePayments = useMemo(() => stripePaymentsOf(sale), [sale]);
  const [selectedPaymentId, setSelectedPaymentId] = useState(paymentId ?? "");
  const [currency, setCurrency] = useState<CheckoutCurrency>("BRL");
  const [amountInput, setAmountInput] = useState("");
  const [generated, setGenerated] = useState<StripeCheckoutSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const initializedKey = useRef("");

  useEffect(() => {
    if (!open) {
      initializedKey.current = "";
      setGenerated(null);
      setErrorMessage(null);
      setSendOpen(false);
      return;
    }

    const sessionKey = `${sale.id}:${paymentId ?? "any"}`;
    if (initializedKey.current === sessionKey) {
      return;
    }

    initializedKey.current = sessionKey;
    const payments = stripePaymentsOf(sale);
    const initial = (paymentId && payments.find((payment) => payment.id === paymentId)) ?? payments[0];
    const nextCurrency = isCheckoutCurrency(initial?.currency) ? initial.currency : "BRL";
    setSelectedPaymentId(initial?.id ?? "");
    setCurrency(nextCurrency);
    setAmountInput(initialAmountInput(initial, nextCurrency));
    setGenerated(null);
    setErrorMessage(null);
  }, [open, paymentId, sale]);

  const selectedPayment = stripePayments.find((payment) => payment.id === selectedPaymentId);
  const displayedUrl = generated?.url ?? selectedPayment?.linkPagamento ?? null;
  const showPaymentSelect = !paymentId && stripePayments.length > 1;

  const saleForSend = useMemo(() => {
    if (!generated || !selectedPaymentId) {
      return sale;
    }

    return {
      ...sale,
      payments: (sale.payments ?? []).map((payment) => (
        payment.id === selectedPaymentId
          ? {
            ...payment,
            linkPagamento: generated.url,
            stripeCheckoutSessionId: generated.sessionId,
            currency: generated.currency,
            originalAmount: generated.originalAmount,
          }
          : payment
      )),
    };
  }, [generated, sale, selectedPaymentId]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPayment) {
        throw new Error("Selecione um pagamento Stripe.");
      }

      const body = buildStripeCheckoutBody({
        currency,
        amount: currency === "BRL" ? undefined : parseCheckoutAmount(amountInput),
      });

      return createStripeCheckoutLink(sale.id, selectedPayment.id, body);
    },
    onSuccess: async (result) => {
      setGenerated(result);
      setErrorMessage(null);
      toast.success("Link Stripe gerado.");
      await queryClient.invalidateQueries({ queryKey: ["sale", sale.id] });
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao gerar link Stripe.");
    },
  });

  function handlePaymentChange(value: string) {
    const payment = stripePayments.find((item) => item.id === value);
    const nextCurrency = isCheckoutCurrency(payment?.currency) ? payment.currency : "BRL";
    setSelectedPaymentId(value);
    setCurrency(nextCurrency);
    setAmountInput(initialAmountInput(payment, nextCurrency));
    setGenerated(null);
    setErrorMessage(null);
  }

  function handleCurrencyChange(value: string) {
    if (!isCheckoutCurrency(value)) {
      return;
    }

    setCurrency(value);
    setErrorMessage(null);
    if (value === "BRL") {
      setAmountInput("");
    }
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  }

  const generateLabel = generateMutation.isPending
    ? "Gerando link..."
    : displayedUrl
      ? "Gerar novo link"
      : "Gerar link";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Link de pagamento Stripe
            </DialogTitle>
            <DialogDescription>
              Gere um link de checkout Stripe para este pagamento. Gerar de novo cria um link novo; o anterior deixa de valer. Links expiram em até 24 horas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {stripePayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pagamento Stripe nesta venda.</p>
            ) : showPaymentSelect ? (
              <div className="space-y-1.5">
                <Label id="stripe-payment-label">Pagamento</Label>
                <Select value={selectedPaymentId} onValueChange={handlePaymentChange}>
                  <SelectTrigger aria-labelledby="stripe-payment-label">
                    <SelectValue placeholder="Selecione o pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {stripePayments.map((payment) => (
                      <SelectItem key={payment.id} value={payment.id}>
                        {paymentOptionLabel(payment)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : selectedPayment ? (
              <p className="text-sm text-muted-foreground">
                Pagamento: {paymentOptionLabel(selectedPayment)}
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label id="stripe-currency-label">Moeda</Label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger id="stripe-currency" aria-labelledby="stripe-currency-label">
                  <SelectValue placeholder="Selecione a moeda" />
                </SelectTrigger>
                <SelectContent>
                  {CHECKOUT_CURRENCIES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {CURRENCY_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{stripeCheckoutMethodHint(currency)}</p>
            </div>

            {currency !== "BRL" && (
              <div className="space-y-1.5">
                <Label htmlFor="stripe-checkout-amount">Valor ({currency}) *</Label>
                <Input
                  id="stripe-checkout-amount"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(event) => {
                    setAmountInput(event.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="0,00"
                  aria-describedby="stripe-checkout-amount-hint"
                />
                <p id="stripe-checkout-amount-hint" className="text-xs text-muted-foreground">
                  Informe o valor em {currency === "USD" ? "dólar" : "euro"}.
                </p>
              </div>
            )}

            {errorMessage && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage}
              </p>
            )}

            {displayedUrl && (
              <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {generated ? "Link gerado" : "Link atual"}
                </p>
                <p className="break-all text-sm">{displayedUrl}</p>
                {generated?.expiresAt ? (
                  <p className="text-xs text-muted-foreground">
                    Expira em {formatDateTime(generated.expiresAt)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Links Stripe expiram em até 24 horas.
                  </p>
                )}
                {generated && (
                  <p className="text-xs text-muted-foreground">
                    {generated.originalAmount != null
                      ? `${formatCurrency(generated.originalAmount, generated.currency)} · `
                      : ""}
                    {formatCurrency(generated.amountBrl, "BRL")}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                    <a href={displayedUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir link Stripe">
                      <ExternalLink className="h-3 w-3" />
                      Abrir
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    aria-label="Copiar link Stripe"
                    onClick={() => {
                      void copyLink(displayedUrl);
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
                    aria-label="Enviar link Stripe no WhatsApp"
                    onClick={() => setSendOpen(true)}
                  >
                    Enviar no WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              type="button"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !selectedPayment}
              aria-label={displayedUrl ? "Gerar novo link Stripe" : "Gerar link Stripe"}
            >
              {generateLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SendPaymentLinkDialog
        sale={saleForSend}
        open={sendOpen}
        onOpenChange={setSendOpen}
        initialPaymentId={selectedPaymentId}
      />
    </>
  );
};

export default StripeCheckoutLinkDialog;
