import type { CommissionBreakdownResult } from "@/lib/commission";
import type { SaleRecord } from "@/lib/commercialApi";
import { toNumberOrZero } from "@/shared/utils/number";
import SaleSummary from "@/features/new-sale/organisms/SaleSummary";
import type { ConfiguredSalePayment, FilledSaleCustomer, SalePaymentDraft } from "@/features/new-sale/types";
import { getSaleCommissionValue } from "../utils";

type SaleDetailPreviewProps = {
  sale: SaleRecord;
};

const SaleDetailPreview = ({ sale }: SaleDetailPreviewProps) => {
  const filledCustomers: FilledSaleCustomer[] = sale.clients.map((client) => ({
    name: client.nameCiphertext || "Sem nome",
    document: client.documentCiphertext || undefined,
  }));

  const saleItems = sale.items.map((item) => ({
    productName: item.product?.name || "Produto nao identificado",
    releaseDate: item.releaseDate?.slice(0, 10) ?? "",
  }));

  const configuredPayments: ConfiguredSalePayment[] = sale.payments.map((payment) => ({
    gateway: payment.gateway,
    paymentType: payment.type,
    amount: toNumberOrZero(payment.amount),
    totalInstallments: payment.totalInstallments ?? undefined,
    feeRate: toNumberOrZero(payment.gatewayFeeRateSnapshot ?? payment.gatewayFee?.feeRate),
  }));

  const paymentBreakdown = configuredPayments.map((payment, index) => {
    const grossAmount = payment.amount;
    const feeAmount = grossAmount * (payment.feeRate / 100);
    const netAmount = grossAmount - feeAmount;
    const commissionAmount = toNumberOrZero(sale.payments[index]?.commission?.amount);

    return {
      gateway: payment.gateway,
      paymentType: payment.paymentType,
      feeRate: payment.feeRate,
      installments: payment.totalInstallments ?? 1,
      grossAmount,
      feeAmount,
      netAmount,
      commissionAmount,
    };
  });

  const commissionRate = toNumberOrZero(sale.seller?.careerPlan?.individualCommissionRate);
  const totalGross = paymentBreakdown.reduce((acc, payment) => acc + payment.grossAmount, 0);
  const totalFees = paymentBreakdown.reduce((acc, payment) => acc + payment.feeAmount, 0);
  const totalNet = paymentBreakdown.reduce((acc, payment) => acc + payment.netAmount, 0);
  const totalCommission = getSaleCommissionValue(sale);

  const commissionBreakdown: CommissionBreakdownResult = {
    commissionRate,
    totalGross,
    totalFees,
    totalNet,
    totalCommission,
    payments: paymentBreakdown,
  };

  const getFeeRate = (gateway: string, paymentType: string) => {
    const payment = configuredPayments.find((item) => item.gateway === gateway && item.paymentType === paymentType);
    return payment?.feeRate ?? 0;
  };

  const paymentGrossValue = (payment: SalePaymentDraft) => toNumberOrZero(payment.amount);

  return (
    <SaleSummary
      filledCustomers={filledCustomers}
      saleItems={saleItems}
      configuredPayments={configuredPayments}
      commissionBreakdown={commissionBreakdown}
      estimatedCommission={totalCommission}
      currency={sale.currency || "BRL"}
      careerPlanName={sale.seller?.careerPlan?.name}
      showCommissionRateWarning
      getFeeRate={getFeeRate}
      paymentGrossValue={paymentGrossValue}
    />
  );
};

export default SaleDetailPreview;
