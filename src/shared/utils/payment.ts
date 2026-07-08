export type PaymentGrossValueInput = {
  amount: string | number;
  paymentType: string;
  totalInstallments?: string | number | null;
  installmentNumber?: number | null;
  dueDate?: string;
};

export type PaymentDisplayContext = {
  allPayments?: PaymentGrossValueInput[];
  index?: number;
  locale?: string;
};

export function isRecurringPaymentType(paymentType: string): boolean {
  return paymentType === "INSTALLMENT" || paymentType === "SUBSCRIPTION";
}

export function isMonthlySubscriptionPayment(
  payment: PaymentGrossValueInput,
  allPayments?: PaymentGrossValueInput[],
): boolean {
  if (payment.paymentType !== "SUBSCRIPTION") {
    return false;
  }

  const installmentNumber = Number(payment.installmentNumber);
  if (Number.isFinite(installmentNumber) && installmentNumber > 0) {
    return true;
  }

  if (!allPayments) {
    return false;
  }

  return allPayments.filter((item) => item.paymentType === "SUBSCRIPTION").length > 1;
}

export function getPaymentInstallmentCount(payment: PaymentGrossValueInput): number {
  if (!isRecurringPaymentType(payment.paymentType)) {
    return 1;
  }

  return Number(payment.totalInstallments || "1") || 1;
}

export function getSubscriptionPaymentSequence(
  payment: PaymentGrossValueInput,
  allPayments: PaymentGrossValueInput[],
  index: number,
): number {
  const installmentNumber = Number(payment.installmentNumber);
  if (Number.isFinite(installmentNumber) && installmentNumber > 0) {
    return installmentNumber;
  }

  const subscriptionEntries = allPayments
    .map((item, itemIndex) => ({ item, itemIndex }))
    .filter(({ item }) => item.paymentType === "SUBSCRIPTION")
    .sort((a, b) => {
      const dateCompare = (a.item.dueDate ?? "").localeCompare(b.item.dueDate ?? "");
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return a.itemIndex - b.itemIndex;
    });

  const position = subscriptionEntries.findIndex(({ itemIndex }) => itemIndex === index);
  return position >= 0 ? position + 1 : 1;
}

export function formatInstallmentLabel(
  payment: PaymentGrossValueInput,
  currency: string,
  context?: PaymentDisplayContext,
): string | null {
  const locale = context?.locale ?? "pt-BR";
  const allPayments = context?.allPayments;
  const index = context?.index ?? 0;

  if (payment.paymentType === "INSTALLMENT") {
    const installments = getPaymentInstallmentCount(payment);
    const unitAmount = Number(payment.amount) || 0;
    const formattedAmount = unitAmount.toLocaleString(locale, { style: "currency", currency });
    const unitLabel = installments === 1 ? "parcela" : "parcelas";

    return `${installments} ${unitLabel} de ${formattedAmount}`;
  }

  if (payment.paymentType === "SUBSCRIPTION") {
    if (allPayments && isMonthlySubscriptionPayment(payment, allPayments)) {
      const sequence = getSubscriptionPaymentSequence(payment, allPayments, index);
      return `${sequence}º pagamento de assinatura`;
    }

    const unitAmount = Number(payment.amount) || 0;
    if (unitAmount > 0) {
      return `${unitAmount.toLocaleString(locale, { style: "currency", currency })} / mês`;
    }
  }

  return null;
}

export function getPaymentGrossValue(
  payment: PaymentGrossValueInput,
  allPayments?: PaymentGrossValueInput[],
): number {
  const amount = Number(payment.amount);
  if (!amount) {
    return 0;
  }

  if (payment.paymentType === "SUBSCRIPTION" && isMonthlySubscriptionPayment(payment, allPayments)) {
    return amount;
  }

  if (payment.paymentType === "INSTALLMENT" || payment.paymentType === "SUBSCRIPTION") {
    return amount * (Number(payment.totalInstallments || "1") || 1);
  }

  return amount;
}

export function toPaymentGrossValueContext(
  payments: Array<{
    amount: string | number;
    paymentType?: string;
    type?: string;
    totalInstallments?: string | number | null;
    installmentNumber?: number | null;
    dueDate?: string | null;
  }>,
): PaymentGrossValueInput[] {
  return payments.map((payment) => ({
    amount: payment.amount,
    paymentType: payment.paymentType ?? payment.type ?? "",
    totalInstallments: payment.totalInstallments,
    installmentNumber: payment.installmentNumber,
    dueDate: payment.dueDate?.slice(0, 10),
  }));
}
