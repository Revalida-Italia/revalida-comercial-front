import { buildCommissionBreakdown, normalizeCommissionRate, type CommissionPaymentInput } from "@/services/commissionApi";
import type { SalePayment, SaleRecord } from "@/services/commercialApi";
import { t } from "@/i18n";
import { toNumberOrZero } from "@/shared/utils/number";
import { getPaymentGrossValue, isMonthlySubscriptionPayment } from "@/shared/utils/payment";
import { getSaleCommissionValue } from "@/features/sales/utils";
import { mapSaleToForm } from "./mapSaleToForm";
import type { ConfiguredSalePayment, FilledSaleCustomer, SaleSummaryItem } from "./types";

export type SaleSummaryFromRecordProps = {
  filledCustomers: FilledSaleCustomer[];
  saleItems: SaleSummaryItem[];
  configuredPayments: ConfiguredSalePayment[];
  commissionBreakdown: ReturnType<typeof buildCommissionBreakdown>;
  estimatedCommission: number;
  currency: string;
  careerPlanName?: string;
  showCommissionRateWarning: boolean;
  getFeeRate: (gateway: string, paymentType: string) => number;
  paymentGrossValue: (payment: { amount: string | number; paymentType: string; totalInstallments?: string | number }) => number;
  subscriptionMonthLabelMode: "compact";
};

function dateOnly(value?: string | null): string {
  return value?.slice(0, 10) ?? "";
}

/** Props for SaleSummary, derived from the same form shape used to edit a sale. */
export function saleSummaryPropsFromRecord(sale: SaleRecord): SaleSummaryFromRecordProps {
  const form = mapSaleToForm(sale);
  const items = sale.items ?? [];
  const payments = sale.payments ?? [];

  const filledCustomers: FilledSaleCustomer[] = form.customers
    .filter((customer) => customer.name.trim())
    .map((customer) => ({
      name: customer.name.trim(),
      document: customer.document?.trim() || undefined,
      telefone: customer.telefone.trim(),
      email: customer.email?.trim() || undefined,
    }));

  const saleItems: SaleSummaryItem[] = form.items
    .filter((item) => item.productId)
    .map((item) => {
      const source = items.find((candidate) => candidate.productId === item.productId && dateOnly(candidate.releaseDate) === item.releaseDate)
        ?? items.find((candidate) => candidate.productId === item.productId);
      return {
        productName: source?.product?.name?.trim() || t("contract.page.unknownProduct"),
        releaseDate: item.releaseDate,
      };
    });

  const configuredPayments: ConfiguredSalePayment[] = [];
  const commissionSources: Array<SalePayment | undefined> = [];

  form.payments.forEach((payment, index) => {
    if (!(Number(payment.amount) > 0) || !payment.gateway || !payment.paymentType) return;
    const source = payments[index];
    const installments = ["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType)
      ? Number(payment.totalInstallments || "1")
      : undefined;
    const feeRate = toNumberOrZero(source?.gatewayFeeRateSnapshot ?? source?.gatewayFee?.feeRate);
    configuredPayments.push({
      id: source?.id,
      status: payment.status || source?.status,
      paymentDate: payment.paymentDate || undefined,
      gateway: payment.gateway,
      paymentType: payment.paymentType,
      amount: Number(payment.amount),
      currency: payment.inputCurrency || form.currency,
      totalInstallments: installments,
      installmentNumber: source?.installmentNumber ?? undefined,
      dueDate: payment.dueDate || undefined,
      feeRate,
      ...(payment.billingType ? { billingType: payment.billingType } : {}),
      ciclo: payment.paymentType === "SUBSCRIPTION" ? payment.ciclo : undefined,
      linkPagamento: source?.linkPagamento ?? undefined,
    });
    commissionSources.push({
      ...source,
      id: source?.id ?? "",
      saleId: source?.saleId ?? sale.id,
      type: payment.paymentType,
      gateway: payment.gateway,
      amount: payment.storedAmountBrl ?? toNumberOrZero(source?.amount),
      status: source?.status ?? payment.status,
      totalInstallments: installments,
      gatewayFeeRateSnapshot: feeRate,
      createdAt: source?.createdAt ?? "",
      updatedAt: source?.updatedAt ?? "",
    });
  });

  const commissionInputs: CommissionPaymentInput[] = configuredPayments.map((configured, index) => {
    const stored = toNumberOrZero(commissionSources[index]?.amount);
    const amount = stored > 0 ? stored : configured.amount;
    return isMonthlySubscriptionPayment(configured, configuredPayments)
      ? {
        gateway: configured.gateway,
        paymentType: "ONE_TIME",
        amount,
        feeRate: configured.feeRate,
      }
      : {
        gateway: configured.gateway,
        paymentType: configured.paymentType,
        amount,
        feeRate: configured.feeRate,
        totalInstallments: configured.totalInstallments,
      };
  });

  const commissionRate = normalizeCommissionRate(sale.seller?.careerPlan?.individualCommissionRate);
  const breakdown = buildCommissionBreakdown(commissionInputs, commissionRate);
  const savedCommission = getSaleCommissionValue(sale);
  const estimatedCommission = savedCommission > 0 ? savedCommission : breakdown.totalCommission;

  return {
    filledCustomers,
    saleItems,
    configuredPayments,
    commissionBreakdown: {
      ...breakdown,
      totalCommission: estimatedCommission,
      payments: breakdown.payments.map((payment, index) => {
        const saved = commissionSources[index]?.commission?.amount;
        return {
          ...payment,
          commissionAmount: saved == null || saved === "" ? payment.commissionAmount : toNumberOrZero(saved),
        };
      }),
    },
    estimatedCommission,
    currency: form.currency,
    careerPlanName: sale.seller?.careerPlan?.name,
    showCommissionRateWarning: false,
    getFeeRate: (gateway, paymentType) =>
      configuredPayments.find((payment) => payment.gateway === gateway && payment.paymentType === paymentType)?.feeRate ?? 0,
    paymentGrossValue: (payment) => getPaymentGrossValue(payment, configuredPayments),
    subscriptionMonthLabelMode: "compact",
  };
}
