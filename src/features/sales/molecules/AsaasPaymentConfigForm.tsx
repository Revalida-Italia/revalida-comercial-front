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
import { t, tCount, type MessageKey } from "@/i18n";

type AsaasPaymentConfigFormProps = {
  payment: SalePaymentDraft;
  currency: string;
  gatewayFees: GatewayFees[];
  gatewayFeesLoading: boolean;
  feeRate: number;
  onUpdatePayment: (field: keyof SalePaymentDraft, value: string) => void;
};

const PAYMENT_TYPE_KEYS: Record<string, MessageKey> = {
  ENTRY: "sales.paymentLink.typeEntry",
  INSTALLMENT: "sales.paymentLink.typeInstallment",
  SUBSCRIPTION: "sales.paymentLink.typeSubscription",
  FULL_PAYMENT: "sales.paymentLink.typeFull",
};

const BILLING_KEYS: Record<string, MessageKey> = {
  PIX: "sales.paymentLink.billingPix",
  BOLETO: "sales.paymentLink.billingBoleto",
  CREDIT_CARD: "sales.paymentLink.billingCard",
};

const CYCLE_KEYS: Record<string, MessageKey> = {
  WEEKLY: "sales.paymentLink.cycleWeekly",
  BIWEEKLY: "sales.paymentLink.cycleBiweekly",
  MONTHLY: "sales.paymentLink.cycleMonthly",
  QUARTERLY: "sales.paymentLink.cycleQuarterly",
  SEMIANNUALLY: "sales.paymentLink.cycleSemiannually",
  YEARLY: "sales.paymentLink.cycleYearly",
};

function paymentTypeLabel(type: string): string {
  const key = PAYMENT_TYPE_KEYS[type];
  return key ? t(key) : (PAYMENT_TYPE_LABELS[type] ?? type);
}

function billingLabel(value: string): string {
  const key = BILLING_KEYS[value];
  if (key) return t(key);
  return BILLING_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function cycleLabel(value: string): string {
  const key = CYCLE_KEYS[value];
  if (key) return t(key);
  return SUBSCRIPTION_CYCLE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

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
  const money = paymentValue.toLocaleString("pt-BR", { style: "currency", currency });

  const amountLabel = isSubscription
    ? t("sales.paymentLink.amountMonth")
    : isSplitOrSubscription
      ? t("sales.paymentLink.amountInstallment")
      : t("sales.paymentLink.amountTotal");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <Label>{t("sales.paymentLink.method")} *</Label>
          <Select
            value={payment.paymentType}
            onValueChange={(value) => onUpdatePayment("paymentType", value)}
            disabled={gatewayFeesLoading || !asaasConfig}
          >
            <SelectTrigger>
              <SelectValue placeholder={gatewayFeesLoading ? t("sales.paymentLink.loading") : t("sales.paymentLink.choose")} />
            </SelectTrigger>
            <SelectContent>
              {paymentOptions.map((option) => (
                <SelectItem key={option.paymentType} value={option.paymentType}>
                  {t("sales.paymentLink.methodOption", { name: paymentTypeLabel(option.paymentType), rate: option.feeRate })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>{t("sales.paymentLink.billing")} *</Label>
          <Select
            value={payment.billingType}
            onValueChange={(value) => onUpdatePayment("billingType", value)}
            disabled={!payment.paymentType}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("sales.paymentLink.billingPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {BILLING_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {billingLabel(option.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isSubscription && (
          <div className="space-y-1.5">
            <Label>{t("sales.paymentLink.cycle")} *</Label>
            <Select value={payment.ciclo} onValueChange={(value) => onUpdatePayment("ciclo", value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("sales.paymentLink.cyclePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_CYCLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {cycleLabel(option.value)}
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
            placeholder={t("sales.paymentLink.amountPlaceholder")}
          />
        </div>

        {isSplitOrSubscription && (
          <div className="space-y-1.5">
            <Label>{isSubscription ? `${t("sales.paymentLink.months")} *` : `${t("sales.paymentLink.installments")} *`}</Label>
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
          <Label>{isSubscription ? `${t("sales.paymentLink.chargeStart")} *` : `${t("sales.paymentLink.payDate")} *`}</Label>
          <DatePicker value={payment.dueDate} onChange={(value) => onUpdatePayment("dueDate", value)} />
        </div>
      </div>

      <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
        {amount > 0 ? (
          <div className="space-y-1">
            <p>
              {t("sales.paymentLink.fee")} <strong>{feeRate}%</strong>
            </p>
            <p>
              {t("sales.paymentLink.thisPayment")} <strong>{money}</strong>
            </p>
            <p>
              {t("sales.paymentLink.payDateLabel")} <strong>{payment.dueDate || t("sales.paymentLink.dateMissing")}</strong>
            </p>
            {isSplitOrSubscription && (
              <p>
                {isSubscription ? t("sales.paymentLink.monthsLabel") : t("sales.paymentLink.installmentsLabel")}{" "}
                <strong>{installments}</strong>
              </p>
            )}
            {!isSubscription && (
              <p>
                {t("sales.paymentLink.linkTotal")} <strong>{money}</strong>
                {" "}
                {isSplitOrSubscription ? tCount("sales.paymentLink.inInstallments", installments) : t("sales.paymentLink.cash")}
              </p>
            )}
            {payment.billingType && (
              <p>
                {t("sales.paymentLink.billingLabel")} <strong>{billingLabel(payment.billingType)}</strong>
              </p>
            )}
          </div>
        ) : (
          <p>{t("sales.paymentLink.fillAmount")}</p>
        )}
      </div>
    </div>
  );
};

export default AsaasPaymentConfigForm;
