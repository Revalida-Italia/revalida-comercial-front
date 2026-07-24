import type { GatewayFees } from "@/services/commercialApi";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BILLING_TYPE_OPTIONS,
  MAX_INSTALLMENTS,
  PAYMENT_TYPE_LABELS,
  SUBSCRIPTION_CYCLE_OPTIONS,
} from "@/features/new-sale/constants";
import type { SalePaymentDraft } from "@/features/new-sale/types";

type AsaasPaymentConfigFormProps = {
  payment: SalePaymentDraft;
  currency: string;
  gatewayFees: GatewayFees[];
  gatewayFeesLoading: boolean;
  feeRate: number;
  onUpdatePayment: (field: keyof SalePaymentDraft, value: string) => void;
};

const AsaasPaymentConfigForm = ({
  payment,
  currency,
  gatewayFees,
  gatewayFeesLoading,
  feeRate,
  onUpdatePayment,
}: AsaasPaymentConfigFormProps) => {
  const asaasConfig = gatewayFees.find((item) => item.gateway === "ASAAS");
  const paymentOptions = asaasConfig?.paymentOptions ?? [];
  const installments = Number(payment.totalInstallments) || 1;
  const isSplitOrSubscription = ["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType);
  const isSubscription = payment.paymentType === "SUBSCRIPTION";
  const isFullPayment = ["FULL_PAYMENT", "ENTRY"].includes(payment.paymentType);
  const parsedAmount = Number(String(payment.amount).replace(",", "."));
  const amount = parsedAmount;
  const paymentValue = parsedAmount > 0
    ? isSplitOrSubscription
      ? parsedAmount * installments
      : parsedAmount
    : 0;

  const amountLabel = isSubscription
    ? "Valor por mês"
    : isSplitOrSubscription
      ? "Valor por parcela"
      : "Valor total";

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 px-3 py-2">
        <p className="text-xs text-muted-foreground">Gateway</p>
        <p className="text-sm font-medium">ASAAS</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Forma de pagamento *</Label>
          <Select
            value={payment.paymentType}
            onValueChange={(value) => onUpdatePayment("paymentType", value)}
            disabled={gatewayFeesLoading || !asaasConfig}
          >
            <SelectTrigger>
              <SelectValue placeholder={gatewayFeesLoading ? "Carregando..." : "Selecione"} />
            </SelectTrigger>
            <SelectContent>
              {(paymentOptions).map((option) => (
                <SelectItem key={option.paymentType} value={option.paymentType}>
                  {PAYMENT_TYPE_LABELS[option.paymentType] ?? option.paymentType} - taxa {option.feeRate}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Meio de cobrança *</Label>
          <Select
            value={payment.billingType}
            onValueChange={(value) => onUpdatePayment("billingType", value)}
            disabled={!payment.paymentType}
          >
            <SelectTrigger>
              <SelectValue placeholder="PIX, boleto, cartão..." />
            </SelectTrigger>
            <SelectContent>
              {BILLING_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isSubscription && (
          <div className="space-y-1.5">
            <Label>Ciclo da assinatura *</Label>
            <Select value={payment.ciclo} onValueChange={(value) => onUpdatePayment("ciclo", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o ciclo" />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_CYCLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className={`grid gap-3 ${isFullPayment ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        <div className="space-y-1.5">
          <Label>{amountLabel} *</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={payment.amount}
            onChange={(event) => onUpdatePayment("amount", event.target.value)}
            placeholder="0,00"
          />
        </div>

        {isSplitOrSubscription && (
          <div className="space-y-1.5">
            <Label>{isSubscription ? "Meses *" : "Parcelas *"}</Label>
            <Input
              type="number"
              min="1"
              max={MAX_INSTALLMENTS}
              step="1"
              inputMode="numeric"
              value={payment.totalInstallments}
              onChange={(event) => onUpdatePayment("totalInstallments", event.target.value)}
              onWheel={(event) => event.currentTarget.blur()}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>{isSubscription ? "Início da cobrança *" : "Data de pagamento *"}</Label>
          <DatePicker value={payment.dueDate} onChange={(value) => onUpdatePayment("dueDate", value)} />
        </div>
      </div>

      <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
        {amount > 0 ? (
          <div className="space-y-1">
            <p>
              Taxa do gateway: <strong>{feeRate}%</strong>
            </p>
            <p>
              Valor deste pagamento:{" "}
              <strong>{paymentValue.toLocaleString("pt-BR", { style: "currency", currency })}</strong>
            </p>
            <p>
              Data de pagamento: <strong>{payment.dueDate || "Não definida"}</strong>
            </p>
            {isSplitOrSubscription && (
              <p>
                {isSubscription ? "Meses" : "Parcelas"}: <strong>{installments}</strong>
              </p>
            )}
            {payment.billingType && (
              <p>
                Meio de cobrança:{" "}
                <strong>
                  {BILLING_TYPE_OPTIONS.find((item) => item.value === payment.billingType)?.label
                    ?? payment.billingType}
                </strong>
              </p>
            )}
          </div>
        ) : (
          <p>Preencha o valor para visualizar os totais.</p>
        )}
      </div>
    </div>
  );
};

export default AsaasPaymentConfigForm;
