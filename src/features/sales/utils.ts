import type { SaleRecord } from "@/services/commercialApi";
import { toNumberOrZero } from "@/shared/utils/number";
import { getPaymentGrossValue, toPaymentGrossValueContext } from "@/shared/utils/payment";

export const isPaymentEligibleForMonthBilling = (payment: SaleRecord["payments"][number]): boolean => {
  if (!payment.commission) {
    return false;
  }

  if (String(payment.type).toUpperCase() === "SUBSCRIPTION") {
    return String(payment.status).toUpperCase() === "PAID";
  }

  return true;
};

export const getSaleNetContractValue = (sale: SaleRecord): number => {
  if (sale.financialSummary?.netContractValue != null) {
    return toNumberOrZero(sale.financialSummary.netContractValue);
  }

  const paymentContext = toPaymentGrossValueContext(sale.payments ?? []);
  let gross = 0;
  let fees = 0;

  paymentContext.forEach((payment, index) => {
    const source = sale.payments?.[index];
    const paymentGross = getPaymentGrossValue(payment, paymentContext);
    const feeRate = toNumberOrZero(source?.gatewayFeeRateSnapshot ?? source?.gatewayFee?.feeRate);
    gross += paymentGross;
    fees += paymentGross * (feeRate / 100);
  });

  return gross - fees;
};

export const formatSalePaymentsProgress = (sale: SaleRecord): string => {
  const summary = sale.financialSummary?.payments;
  if (!summary) {
    return String(sale.payments?.length ?? 0);
  }

  if (summary.installmentTotal && summary.installmentTotal > 0) {
    return `${summary.installmentPaid ?? 0}/${summary.installmentTotal} parcelas pagas`;
  }

  if (summary.subscriptionTotal > 0) {
    return `${summary.subscriptionPaid}/${summary.subscriptionTotal} assin. pagas`;
  }

  return `${summary.paid} pagos · ${summary.pending} pendentes`;
};

export const getSaleContractValue = (sale: SaleRecord): number => {
  const contract = toNumberOrZero(sale.contractValue);
  if (contract > 0) {
    return contract;
  }

  const paymentContext = toPaymentGrossValueContext(sale.payments ?? []);

  return paymentContext.reduce(
    (acc, payment) => acc + getPaymentGrossValue(payment, paymentContext),
    0,
  );
};

export const getSaleCommissionValue = (sale: SaleRecord): number => {
  const fromCommissions = (sale.commissions ?? []).reduce((acc, commission) => acc + toNumberOrZero(commission.amount), 0);
  if (fromCommissions > 0) {
    return fromCommissions;
  }
  return (sale.payments ?? []).reduce((acc, payment) => acc + toNumberOrZero(payment.commission?.amount), 0);
};

export const getPrimaryClientName = (sale: SaleRecord): string =>
  sale.clients?.[0]?.nameCiphertext?.trim() || "Cliente";

export const getPrimaryClientPhone = (sale: SaleRecord): string =>
  sale.clients?.[0]?.telefone?.trim() || "";

export const getSaleCustomerNames = (sale: SaleRecord): string => {
  const names = (sale.clients ?? [])
    .map((client) => client.nameCiphertext?.trim())
    .filter((name): name is string => Boolean(name));

  if (names.length === 0) {
    return "Cliente não informado";
  }

  if (names.length === 1) {
    return names[0];
  }

  return `${names[0]} +${names.length - 1}`;
};

export const getSaleProductName = (sale: SaleRecord): string =>
  sale.items?.[0]?.product?.name ?? "Produto não informado";

export const getSaleSellerInfo = (sale: SaleRecord): string => {
  if (!sale.seller) {
    return "Vendedor não informado";
  }
  
  if (sale.seller.name) {
    return `${sale.seller.name} (${sale.seller.email || "sem email"})`;
  }
  
  return sale.seller.email || "Vendedor não informado";
};

export const saleHasPaidRecords = (sale: SaleRecord): boolean => {
  const paidPayment = (sale.payments ?? []).some(
    (payment) => String(payment.status).toUpperCase() === "PAID",
  );
  const paidCommission = (sale.commissions ?? []).some(
    (commission) => String(commission.status).toUpperCase() === "PAID",
  )
    || (sale.payments ?? []).some(
      (payment) => String(payment.commission?.status ?? "").toUpperCase() === "PAID",
    );

  return paidPayment || paidCommission;
};

export const saleHasActiveSubscription = (sale: SaleRecord): boolean =>
  Boolean(sale.asaasSubscriptionId)
  || (sale.payments ?? []).some((payment) => {
    const type = String(payment.type).toUpperCase();
    return type === "SUBSCRIPTION" || Boolean(payment.ciclo);
  });
