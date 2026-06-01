import type { GatewayFees } from "@/services/commercialApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  BILLING_TYPE_OPTIONS,
  MAX_INSTALLMENTS,
  PAYMENT_TYPE_LABELS,
  SUBSCRIPTION_CYCLE_OPTIONS,
} from "../constants";
import type { SalePaymentDraft } from "../types";

type PaymentsStepProps = {
  currency: string;
  payments: SalePaymentDraft[];
  gatewayFees: GatewayFees[];
  gatewayFeesLoading: boolean;
  canGoNext: boolean;
  onCurrencyChange: (value: string) => void;
  onUpdatePayment: (index: number, field: keyof SalePaymentDraft, value: string) => void;
  onAddPayment: () => void;
  onRemovePayment: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
  getFeeRate: (gateway: string, paymentType: string) => number;
  paymentGrossValue: (payment: SalePaymentDraft) => number;
};

const PaymentsStep = ({
  currency,
  payments,
  gatewayFees,
  gatewayFeesLoading,
  canGoNext,
  onCurrencyChange,
  onUpdatePayment,
  onAddPayment,
  onRemovePayment,
  onBack,
  onNext,
  getFeeRate,
  paymentGrossValue,
}: PaymentsStepProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Pagamentos</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label>Moeda</Label>
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BRL">BRL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {payments.map((payment, index) => {
        const gatewayConfig = gatewayFees.find((item) => item.gateway === payment.gateway);
        const feeRate = getFeeRate(payment.gateway, payment.paymentType);
        const amount = Number(payment.amount);
        const installments = Number(payment.totalInstallments) || 1;
        const paymentValue = paymentGrossValue(payment);
        const isSplitOrSubscription = ["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType);
        const isSubscription = payment.paymentType === "SUBSCRIPTION";

        return (
          <div key={index} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Pagamento {index + 1}</span>
              {payments.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemovePayment(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Gateway *</Label>
                <Select value={payment.gateway} onValueChange={(value) => onUpdatePayment(index, "gateway", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={gatewayFeesLoading ? "Carregando..." : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    {gatewayFees.map((gatewayItem) => (
                      <SelectItem key={gatewayItem.gateway} value={gatewayItem.gateway}>
                        {gatewayItem.gateway}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Forma de pagamento *</Label>
                <Select
                  value={payment.paymentType}
                  onValueChange={(value) => onUpdatePayment(index, "paymentType", value)}
                  disabled={!payment.gateway}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(gatewayConfig?.paymentOptions ?? []).map((option) => (
                      <SelectItem key={option.paymentType} value={option.paymentType}>
                        {PAYMENT_TYPE_LABELS[option.paymentType] ?? option.paymentType} - taxa {option.feeRate}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Meio de cobranca *</Label>
                <Select
                  value={payment.billingType}
                  onValueChange={(value) => onUpdatePayment(index, "billingType", value)}
                  disabled={!payment.paymentType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="PIX, boleto..." />
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
                  <Select value={payment.ciclo} onValueChange={(value) => onUpdatePayment(index, "ciclo", value)}>
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

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>
                  Valor{["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType) ? " por parcela/mes" : ""} *
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payment.amount}
                  onChange={(event) => onUpdatePayment(index, "amount", event.target.value)}
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
                    onChange={(event) => onUpdatePayment(index, "totalInstallments", event.target.value)}
                    onWheel={(event) => event.currentTarget.blur()}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>{isSubscription ? "Inicio da cobrança *" : "Data de pagamento *"}</Label>
                <DatePicker value={payment.dueDate} onChange={(value) => onUpdatePayment(index, "dueDate", value)} />
                {isSubscription && (
                  <p className="-mt-0.5 rounded-sm bg-amber-50/45 px-2 py-1 text-[11px] leading-tight text-amber-900/60">
                    Esta data define o início da cobrança (primeiro pagamento).
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              {amount > 0 ? (
                <div className="space-y-1">
                  <p>
                    Taxa do gateway: <strong>{feeRate}%</strong>
                  </p>
                  <p>
                    Valor deste pagamento: <strong>{paymentValue.toLocaleString("pt-BR", { style: "currency", currency })}</strong>
                  </p>
                  <p>
                    Data de pagamento: <strong>{payment.dueDate || "Nao definida"}</strong>
                  </p>
                  {["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType) && (
                    <p>
                      {payment.paymentType === "SUBSCRIPTION" ? "Meses" : "Parcelas"}: <strong>{installments}</strong>
                    </p>
                  )}
                  {payment.billingType && (
                    <p>
                      Meio de cobranca: <strong>{BILLING_TYPE_OPTIONS.find((item) => item.value === payment.billingType)?.label ?? payment.billingType}</strong>
                    </p>
                  )}
                  {isSubscription && payment.ciclo && (
                    <p>
                      Ciclo: <strong>{SUBSCRIPTION_CYCLE_OPTIONS.find((item) => item.value === payment.ciclo)?.label ?? payment.ciclo}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <p>Preencha o valor para visualizar os totais.</p>
              )}
            </div>
          </div>
        );
      })}

      <Button variant="outline" size="sm" className="w-full gap-2" onClick={onAddPayment}>
        <Plus className="h-4 w-4" />
        Adicionar pagamento
      </Button>

      <div className="md:col-span-2 flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onNext} disabled={!canGoNext}>
          Proximo
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default PaymentsStep;
