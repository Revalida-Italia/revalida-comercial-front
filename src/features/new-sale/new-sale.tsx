import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSale, listGatewayFees, type BillingType, type CreateSaleCustomer } from "@/services/commercialApi";
import { listProducts } from "@/services/productsApi";
import { buildCommissionBreakdown, normalizeCommissionRate } from "@/services/commissionApi";
import { fetchExchangeRates } from "@/services/exchangeRatesApi";
import { convertToBrl, isDisplayCurrency } from "@/shared/utils/exchange";
import { getProfile } from "@/lib/session";
import {
  DEFAULT_SUBSCRIPTION_CYCLE,
  EMPTY_CUSTOMER,
  EMPTY_PAYMENT,
  MAX_INSTALLMENTS,
  STEP_LABELS,
} from "./constants";
import type { SaleItemDraft, SalePaymentDraft } from "./types";
import ConfirmStep from "./organisms/ConfirmStep";
import CustomersStep from "./organisms/CustomersStep";
import PaymentsStep from "./organisms/PaymentsStep";
import ProductStep from "./organisms/ProductStep";
import SaleSummary from "@/features/new-sale/organisms/SaleSummary";
import StepIndicator from "./organisms/StepIndicator";

type PaymentValueLike = {
  amount: string | number;
  paymentType: string;
  totalInstallments?: string | number;
};

const NewSaleFeature = () => {
  const queryClient = useQueryClient();
  const profile = getProfile();

  const [step, setStep] = useState(1);

  const [customers, setCustomers] = useState<CreateSaleCustomer[]>([{ ...EMPTY_CUSTOMER }]);

  const [saleItemsDraft, setSaleItemsDraft] = useState<SaleItemDraft[]>([{ productId: "", releaseDate: "", notes: "" }]);

  const [payments, setPayments] = useState<SalePaymentDraft[]>([{ ...EMPTY_PAYMENT }]);

  const needsExchangeRates = useMemo(
    () => payments.some((payment) => payment.inputCurrency !== "BRL"),
    [payments],
  );

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  const gatewayFeesQuery = useQuery({
    queryKey: ["gateway-fees"],
    queryFn: () => listGatewayFees(),
    enabled: step >= 3,
  });

  const exchangeRatesQuery = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: fetchExchangeRates,
    enabled: step >= 3 && needsExchangeRates,
    staleTime: 5 * 60_000,
  });

  const selectedSaleItems = useMemo(
    () => saleItemsDraft
      .filter((item) => item.productId && item.releaseDate)
      .map((item) => ({
        productId: item.productId,
        releaseDate: item.releaseDate,
      })),
    [saleItemsDraft],
  );

  const hasDuplicateProducts = useMemo(() => {
    const ids = saleItemsDraft.map((item) => item.productId).filter(Boolean);
    return new Set(ids).size !== ids.length;
  }, [saleItemsDraft]);

  const saleSummaryItems = useMemo(
    () => selectedSaleItems.map((item) => ({
      productName: productsQuery.data?.find((product) => product.id === item.productId)?.name ?? "Produto não identificado",
      releaseDate: item.releaseDate,
    })),
    [selectedSaleItems, productsQuery.data],
  );

  const commissionRate = useMemo(() => {
    const profileAny = profile as unknown as Record<string, unknown> | null;
    const careerPlanAny = (profileAny?.careerPlan as Record<string, unknown> | undefined) ?? {};

    const candidates: unknown[] = [
      careerPlanAny.individualCommissionRate,
      careerPlanAny.commissionPercentage,
      profileAny?.individualCommissionRate,
      profileAny?.commissionPercentage,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeCommissionRate(candidate);
      if (normalized > 0) {
        return normalized;
      }
    }

    return 0;
  }, [profile]);

  const filledCustomers = useMemo(
    () => customers
      .filter((c) => c.name.trim() && c.telefone.trim())
      .map((c) => ({
        name: c.name.trim(),
        document: c.document?.trim() || undefined,
        telefone: c.telefone.trim(),
        email: c.email?.trim() || undefined,
      })),
    [customers],
  );

  function getFeeRate(gateway: string, paymentType: string): number {
    if (!gateway || !paymentType) return 0;
    const feeConfig = gatewayFeesQuery.data?.find((item) => item.gateway === gateway);
    const feeRate = feeConfig?.paymentOptions.find((option) => option.paymentType === paymentType)?.feeRate;

    if (typeof feeRate === "string") {
      return Number(feeRate) || 0;
    }

    return feeRate ?? 0;
  }

  function paymentGrossValue(payment: PaymentValueLike): number {
    const amount = Number(payment.amount);
    if (!amount) return 0;
    if (["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType)) {
      return amount * (Number(payment.totalInstallments || "1") || 1);
    }
    return amount;
  }

  function hasConfiguredBillingType(payment: SalePaymentDraft): payment is SalePaymentDraft & { billingType: BillingType } {
    return Boolean(payment.gateway && payment.paymentType && payment.dueDate && payment.billingType);
  }

  const configuredPayments = useMemo(
    () => payments
      .filter((payment): payment is SalePaymentDraft & { billingType: BillingType } => Number(payment.amount) > 0 && hasConfiguredBillingType(payment))
      .map((payment) => {
        const rawAmount = Number(payment.amount);
        const inputCurrency = payment.inputCurrency || "BRL";
        const amountInBrl = inputCurrency === "BRL"
          ? convertToBrl(rawAmount, "BRL")
          : exchangeRatesQuery.data?.rates
            ? convertToBrl(rawAmount, inputCurrency, exchangeRatesQuery.data.rates)
            : 0;

        return {
          gateway: payment.gateway,
          paymentType: payment.paymentType,
          amount: amountInBrl,
          totalInstallments: ["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType)
            ? Number(payment.totalInstallments || "1")
            : undefined,
          dueDate: payment.dueDate,
          billingType: payment.billingType,
          ciclo: payment.paymentType === "SUBSCRIPTION"
            ? payment.ciclo || DEFAULT_SUBSCRIPTION_CYCLE
            : undefined,
          feeRate: getFeeRate(payment.gateway, payment.paymentType),
        };
      }),
    [payments, gatewayFeesQuery.data, exchangeRatesQuery.data?.rates],
  );

  const commissionBreakdown = useMemo(
    () => buildCommissionBreakdown(configuredPayments, commissionRate),
    [configuredPayments, commissionRate],
  );

  const estimatedCommission = commissionBreakdown.totalCommission;

  const canGoStep2 = filledCustomers.length > 0;
  const canGoStep3 = selectedSaleItems.length > 0
    && selectedSaleItems.length === saleItemsDraft.length
    && !hasDuplicateProducts;

  const hasValidPayments = payments.length > 0
    && payments.every((payment) => {
      const amountOk = Number(payment.amount) > 0;
      const baseOk = Boolean(payment.gateway && payment.paymentType && payment.dueDate && payment.billingType && amountOk);
      if (!baseOk) return false;
      if (["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType)) {
        const installments = Number(payment.totalInstallments);
        return Number.isInteger(installments) && installments >= 1 && installments <= MAX_INSTALLMENTS;
      }
      return true;
    });

  const hasExchangeRatesReady = !needsExchangeRates
    || Boolean(exchangeRatesQuery.data?.rates);

  const canGoStep4 = hasValidPayments && hasExchangeRatesReady && !(needsExchangeRates && exchangeRatesQuery.isError);
  const canSubmit = canGoStep2 && canGoStep3 && canGoStep4 && Boolean(profile?.sub);

  function updateCustomer(index: number, field: keyof CreateSaleCustomer, value: string) {
    setCustomers((prev) => prev.map((customer, i) => (i === index ? { ...customer, [field]: value } : customer)));
  }

  function addCustomer() {
    setCustomers((prev) => [...prev, { ...EMPTY_CUSTOMER }]);
  }

  function removeCustomer(index: number) {
    setCustomers((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSaleItem(index: number, field: keyof SaleItemDraft, value: string) {
    setSaleItemsDraft((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addSaleItem() {
    setSaleItemsDraft((prev) => [...prev, { productId: "", releaseDate: "", notes: "" }]);
  }

  function removeSaleItem(index: number) {
    setSaleItemsDraft((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePayment(index: number, field: keyof SalePaymentDraft, value: string) {
    setPayments((prev) => prev.map((payment, i) => {
      if (i !== index) return payment;
      if (field === "gateway") {
        return { ...payment, gateway: value, paymentType: "" };
      }
      if (field === "paymentType") {
        return {
          ...payment,
          paymentType: value,
          totalInstallments: payment.totalInstallments || "1",
          ciclo: value === "SUBSCRIPTION" ? payment.ciclo || DEFAULT_SUBSCRIPTION_CYCLE : DEFAULT_SUBSCRIPTION_CYCLE,
        };
      }
      if (field === "totalInstallments") {
        return { ...payment, totalInstallments: value };
      }
      if (field === "inputCurrency") {
        return {
          ...payment,
          inputCurrency: isDisplayCurrency(value) ? value : "BRL",
        };
      }
      return { ...payment, [field]: value };
    }));
  }

  function addPayment() {
    setPayments((prev) => [...prev, { ...EMPTY_PAYMENT }]);
  }

  function removePayment(index: number) {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!profile?.sub) {
        throw new Error("Usuario sem sub/externalId no perfil.");
      }

      if (configuredPayments.length === 0) {
        throw new Error("Adicione pelo menos um pagamento valido.");
      }

      if (selectedSaleItems.length === 0 || selectedSaleItems.length !== saleItemsDraft.length) {
        throw new Error("Adicione pelo menos um modulo com data de liberacao.");
      }

      if (hasDuplicateProducts) {
        throw new Error("Nao e permitido selecionar o mesmo modulo mais de uma vez.");
      }

      if (needsExchangeRates && !exchangeRatesQuery.data?.rates) {
        throw new Error("Cotação indisponível para converter o pagamento para BRL.");
      }

      await createSale({
        sellerId: profile.sub,
        currency: "BRL",
        saveExchange: needsExchangeRates,
        clients: filledCustomers.map((c) => ({
          nameCiphertext: c.name,
          documentCiphertext: c.document ?? "",
          telefone: c.telefone,
          ...(c.email ? { email: c.email } : {}),
        })),
        items: selectedSaleItems,
        payments: configuredPayments.map((payment) => ({
          gateway: payment.gateway,
          type: payment.paymentType,
          amount: payment.amount,
          dueDate: payment.dueDate,
          billingType: payment.billingType,
          ...(payment.ciclo ? { ciclo: payment.ciclo } : {}),
          ...(payment.totalInstallments ? { totalInstallments: payment.totalInstallments } : {}),
        })),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda criada com sucesso.");
      setStep(1);
      setCustomers([{ ...EMPTY_CUSTOMER }]);
      setSaleItemsDraft([{ productId: "", releaseDate: "", notes: "" }]);
      setPayments([{ ...EMPTY_PAYMENT }]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao criar venda.");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Nova venda</h1>
        <p className="text-muted-foreground">Preencha as informações passo a passo.</p>
      </div>

      <StepIndicator labels={STEP_LABELS} step={step} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          {step === 1 && (
            <CustomersStep
              customers={customers}
              canGoNext={canGoStep2}
              onUpdateCustomer={updateCustomer}
              onAddCustomer={addCustomer}
              onRemoveCustomer={removeCustomer}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <ProductStep
              products={productsQuery.data ?? []}
              productsLoading={productsQuery.isLoading}
              items={saleItemsDraft}
              hasDuplicateProducts={hasDuplicateProducts}
              canGoNext={canGoStep3}
              onUpdateItem={updateSaleItem}
              onAddItem={addSaleItem}
              onRemoveItem={removeSaleItem}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <PaymentsStep
              payments={payments}
              gatewayFees={gatewayFeesQuery.data ?? []}
              gatewayFeesLoading={gatewayFeesQuery.isLoading}
              canGoNext={canGoStep4}
              exchangeRates={exchangeRatesQuery.data?.rates}
              ratesStale={Boolean(exchangeRatesQuery.data?.stale)}
              rateDate={exchangeRatesQuery.data?.rateDate}
              ratesLoading={exchangeRatesQuery.isLoading || exchangeRatesQuery.isFetching}
              ratesError={exchangeRatesQuery.isError}
              onUpdatePayment={updatePayment}
              onAddPayment={addPayment}
              onRemovePayment={removePayment}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              getFeeRate={getFeeRate}
              paymentGrossValue={paymentGrossValue}
            />
          )}

          {step === 4 && (
            <ConfirmStep
              filledCustomers={filledCustomers}
              saleItems={saleSummaryItems}
              configuredPayments={configuredPayments}
              commissionBreakdown={commissionBreakdown}
              estimatedCommission={estimatedCommission}
              currency="BRL"
              careerPlanName={profile?.careerPlan?.name}
              canSubmit={canSubmit}
              isSaving={mutation.isPending}
              onBack={() => setStep(3)}
              onSubmit={() => mutation.mutate()}
              getFeeRate={getFeeRate}
              paymentGrossValue={paymentGrossValue}
            />
          )}
        </div>

        <div className="hidden lg:block">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Prévia da venda</CardTitle>
            </CardHeader>
            <CardContent>
              <SaleSummary
                filledCustomers={filledCustomers}
                saleItems={saleSummaryItems}
                configuredPayments={configuredPayments}
                commissionBreakdown={commissionBreakdown}
                estimatedCommission={estimatedCommission}
                currency="BRL"
                careerPlanName={profile?.careerPlan?.name}
                showCommissionRateWarning
                getFeeRate={getFeeRate}
                paymentGrossValue={paymentGrossValue}
                subscriptionMonthLabelMode="compact"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NewSaleFeature;
