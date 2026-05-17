export interface CommissionPaymentInput {
  gateway: string;
  paymentType: string;
  amount: number;
  feeRate: number;
  totalInstallments?: number;
}

export interface SubscriptionMonthlyCommission {
  month: number;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  commissionAmount: number;
}

export interface CommissionPaymentBreakdown {
  gateway: string;
  paymentType: string;
  feeRate: number;
  installments: number;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  commissionAmount: number;
  monthlyCommissions?: SubscriptionMonthlyCommission[];
}

export interface CommissionBreakdownResult {
  commissionRate: number;
  totalGross: number;
  totalFees: number;
  totalNet: number;
  totalCommission: number;
  payments: CommissionPaymentBreakdown[];
}

export function normalizeCommissionRate(rawValue: unknown): number {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function safeInstallments(totalInstallments?: number): number {
  const parsed = Number(totalInstallments);
  const MAX_INSTALLMENTS = 120;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.min(Math.floor(parsed), MAX_INSTALLMENTS);
}

function calculatePayment(
  payment: CommissionPaymentInput,
  commissionRate: number,
): CommissionPaymentBreakdown {
  const installments = safeInstallments(payment.totalInstallments);
  const feeDecimal = payment.feeRate / 100;
  const commissionDecimal = commissionRate / 100;

  if (payment.paymentType === "SUBSCRIPTION") {
    const monthlyCommissions: SubscriptionMonthlyCommission[] = Array.from({ length: installments }, (_, idx) => {
      const grossAmount = payment.amount;
      const feeAmount = grossAmount * feeDecimal;
      const netAmount = grossAmount - feeAmount;
      const commissionAmount = netAmount * commissionDecimal;

      return {
        month: idx + 1,
        grossAmount,
        feeAmount,
        netAmount,
        commissionAmount,
      };
    });

    const grossAmount = monthlyCommissions.reduce((acc, item) => acc + item.grossAmount, 0);
    const feeAmount = monthlyCommissions.reduce((acc, item) => acc + item.feeAmount, 0);
    const netAmount = monthlyCommissions.reduce((acc, item) => acc + item.netAmount, 0);
    const commissionAmount = monthlyCommissions.reduce((acc, item) => acc + item.commissionAmount, 0);

    return {
      gateway: payment.gateway,
      paymentType: payment.paymentType,
      feeRate: payment.feeRate,
      installments,
      grossAmount,
      feeAmount,
      netAmount,
      commissionAmount,
      monthlyCommissions,
    };
  }

  const grossAmount = payment.paymentType === "INSTALLMENT"
    ? payment.amount * installments
    : payment.amount;
  const feeAmount = grossAmount * feeDecimal;
  const netAmount = grossAmount - feeAmount;
  const commissionAmount = netAmount * commissionDecimal;

  return {
    gateway: payment.gateway,
    paymentType: payment.paymentType,
    feeRate: payment.feeRate,
    installments,
    grossAmount,
    feeAmount,
    netAmount,
    commissionAmount,
  };
}

export function buildCommissionBreakdown(
  payments: CommissionPaymentInput[],
  commissionRate: number,
): CommissionBreakdownResult {
  const normalizedRate = normalizeCommissionRate(commissionRate);
  const breakdownPayments = payments.map((payment) => calculatePayment(payment, normalizedRate));

  return {
    commissionRate: normalizedRate,
    totalGross: breakdownPayments.reduce((acc, payment) => acc + payment.grossAmount, 0),
    totalFees: breakdownPayments.reduce((acc, payment) => acc + payment.feeAmount, 0),
    totalNet: breakdownPayments.reduce((acc, payment) => acc + payment.netAmount, 0),
    totalCommission: breakdownPayments.reduce((acc, payment) => acc + payment.commissionAmount, 0),
    payments: breakdownPayments,
  };
}
