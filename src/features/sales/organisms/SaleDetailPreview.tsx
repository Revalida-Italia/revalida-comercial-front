import type { CommissionBreakdownResult } from "@/services/commissionApi";
import { buildCommissionBreakdown } from "@/services/commissionApi";
import type { SaleRecord } from "@/services/commercialApi";
import { toNumberOrZero } from "@/shared/utils/number";
import { getPaymentGrossValue, isMonthlySubscriptionPayment } from "@/shared/utils/payment";
import type { ConfiguredSalePayment, FilledSaleCustomer } from "@/features/new-sale/types";
import { getSaleCommissionValue } from "../utils";
import SaleSummary from "@/features/new-sale/organisms/SaleSummary";
import { useMemo } from "react";

type SaleDetailPreviewProps = {
  sale: SaleRecord;
};

const SaleDetailPreview = ({ sale }: SaleDetailPreviewProps) => {
  const filledCustomers: FilledSaleCustomer[] = sale.clients.map((client) => ({
    name: client.nameCiphertext || "Sem nome",
    document: client.documentCiphertext || undefined,
    telefone: client.telefone || "-",
    email: client.email || undefined,
  }));

  const saleItems = sale.items.map((item) => ({
    productName: item.product?.name || "Produto não identificado",
    releaseDate: item.releaseDate?.slice(0, 10) ?? "",
  }));

  const configuredPayments: ConfiguredSalePayment[] = sale.payments.map((payment) => ({
    gateway: payment.gateway,
    paymentType: payment.type,
    amount: toNumberOrZero(payment.amount),
    totalInstallments: payment.totalInstallments ?? undefined,
    installmentNumber: payment.installmentNumber ?? undefined,
    dueDate: payment.dueDate?.slice(0, 10) ?? undefined,
    feeRate: toNumberOrZero(payment.gatewayFeeRateSnapshot ?? payment.gatewayFee?.feeRate),
    linkPagamento: payment.linkPagamento ?? undefined,
    billingType: (payment.billingType as ConfiguredSalePayment["billingType"]) || "PIX",
    ciclo: payment.ciclo ? (payment.ciclo as ConfiguredSalePayment["ciclo"]) : undefined,
  }));

  const commissionRate = toNumberOrZero(sale.seller?.careerPlan?.individualCommissionRate);
  const totalCommission = getSaleCommissionValue(sale);

  const commissionBreakdown: CommissionBreakdownResult = useMemo(() => {
    const breakdown = buildCommissionBreakdown(
      configuredPayments.map((payment) => {
        if (isMonthlySubscriptionPayment(payment, configuredPayments)) {
          return {
            gateway: payment.gateway,
            paymentType: "ONE_TIME",
            amount: payment.amount,
            feeRate: payment.feeRate,
          };
        }

        return {
          gateway: payment.gateway,
          paymentType: payment.paymentType,
          amount: payment.amount,
          feeRate: payment.feeRate,
          totalInstallments: payment.totalInstallments,
        };
      }),
      commissionRate,
    );

    return {
      ...breakdown,
      totalCommission,
      payments: breakdown.payments.map((payment, index) => ({
        ...payment,
        commissionAmount: toNumberOrZero(sale.payments[index]?.commission?.amount),
      })),
    };
  }, [configuredPayments, commissionRate, sale.payments, totalCommission]);

  const getFeeRate = (gateway: string, paymentType: string) => {
    const payment = configuredPayments.find((item) => item.gateway === gateway && item.paymentType === paymentType);
    return payment?.feeRate ?? 0;
  };

  const paymentGrossValue = (payment: ConfiguredSalePayment) => getPaymentGrossValue(payment, configuredPayments);

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
      saleId={sale.id}
    />
  );
};

export default SaleDetailPreview;
