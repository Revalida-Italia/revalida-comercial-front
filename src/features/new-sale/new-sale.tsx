import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSale, listGatewayFees, listProducts } from "@/lib/commercialApi";
import type { CreateSaleCustomer } from "@/lib/commercialApi";
import { buildCommissionBreakdown, normalizeCommissionRate } from "@/lib/commission";
import { getProfile } from "@/lib/session";
import { EMPTY_CUSTOMER, EMPTY_PAYMENT, MAX_INSTALLMENTS, STEP_LABELS } from "./constants";
import type { SalePaymentDraft } from "./types";
import ConfirmStep from "./organisms/ConfirmStep";
import CustomersStep from "./organisms/CustomersStep";
import PaymentsStep from "./organisms/PaymentsStep";
import ProductStep from "./organisms/ProductStep";
import SaleSummary from "./organisms/SaleSummary";
import StepIndicator from "./organisms/StepIndicator";

function normalizeInstallments(rawValue: string): string {
  const digitsOnly = rawValue.replace(/\D/g, "");
  if (!digitsOnly) {
    return "";
  }
  const normalized = Math.max(1, Math.min(Number(digitsOnly), MAX_INSTALLMENTS));
  return String(normalized);
}

const NewSaleFeature = () => {
  const queryClient = useQueryClient();
  const profile = getProfile();

  const [step, setStep] = useState(1);

  const [customers, setCustomers] = useState<CreateSaleCustomer[]>([{ ...EMPTY_CUSTOMER }]);

  const [productId, setProductId] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  const [currency, setCurrency] = useState("BRL");
  const [payments, setPayments] = useState<SalePaymentDraft[]>([{ ...EMPTY_PAYMENT }]);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  const gatewayFeesQuery = useQuery({
    queryKey: ["gateway-fees"],
    queryFn: listGatewayFees,
    enabled: step >= 3,
  });

  const productName = productsQuery.data?.find((p) => p.id === productId)?.name;
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
    () => customers.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), document: c.document?.trim() || undefined })),
    [customers],
  );

  function getFeeRate(gateway: string, paymentType: string): number {
    if (!gateway || !paymentType) return 0;
    const feeConfig = gatewayFeesQuery.data?.find((item) => item.gateway === gateway);
    return feeConfig?.paymentOptions.find((option) => option.paymentType === paymentType)?.feeRate ?? 0;
  }

  function paymentGrossValue(payment: SalePaymentDraft): number {
    const amount = Number(payment.amount);
    if (!amount) return 0;
    if (["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType)) {
      return amount * (Number(normalizeInstallments(payment.totalInstallments || "1")) || 1);
    }
    return amount;
  }

  const configuredPayments = useMemo(
    () => payments
      .filter((payment) => Number(payment.amount) > 0 && payment.gateway && payment.paymentType)
      .map((payment) => ({
        gateway: payment.gateway,
        paymentType: payment.paymentType,
        amount: Number(payment.amount),
        totalInstallments: ["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType)
          ? Number(normalizeInstallments(payment.totalInstallments || "1"))
          : undefined,
        feeRate: getFeeRate(payment.gateway, payment.paymentType),
      })),
    [payments, gatewayFeesQuery.data],
  );

  const commissionBreakdown = useMemo(
    () => buildCommissionBreakdown(configuredPayments, commissionRate),
    [configuredPayments, commissionRate],
  );

  const estimatedCommission = commissionBreakdown.totalCommission;

  const canGoStep2 = filledCustomers.length > 0;
  const canGoStep3 = Boolean(productId && releaseDate);

  const hasValidPayments = payments.length > 0
    && payments.every((payment) => {
      const amountOk = Number(payment.amount) > 0;
      const baseOk = Boolean(payment.gateway && payment.paymentType && amountOk);
      if (!baseOk) return false;
      if (["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType)) {
        return Number(normalizeInstallments(payment.totalInstallments || "1")) >= 1;
      }
      return true;
    });

  const canGoStep4 = hasValidPayments;
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
        };
      }
      if (field === "totalInstallments") {
        return { ...payment, totalInstallments: normalizeInstallments(value) };
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

      await createSale({
        sellerId: profile.sub,
        currency,
        clients: filledCustomers.map((c) => ({
          nameCiphertext: c.name,
          documentCiphertext: c.document ?? "",
        })),
        items: [{ productId, releaseDate }],
        payments: configuredPayments.map((payment) => ({
          gateway: payment.gateway,
          type: payment.paymentType,
          amount: payment.amount,
          ...(payment.totalInstallments ? { totalInstallments: payment.totalInstallments } : {}),
        })),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda criada com sucesso.");
      setStep(1);
      setCustomers([{ ...EMPTY_CUSTOMER }]);
      setProductId("");
      setReleaseDate("");
      setCurrency("BRL");
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
        <p className="text-muted-foreground">Preencha as informacoes passo a passo.</p>
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
              productId={productId}
              releaseDate={releaseDate}
              canGoNext={canGoStep3}
              onProductChange={setProductId}
              onReleaseDateChange={setReleaseDate}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <PaymentsStep
              currency={currency}
              payments={payments}
              gatewayFees={gatewayFeesQuery.data ?? []}
              gatewayFeesLoading={gatewayFeesQuery.isLoading}
              canGoNext={canGoStep4}
              onCurrencyChange={setCurrency}
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
              productName={productName}
              releaseDate={releaseDate}
              configuredPayments={configuredPayments}
              commissionBreakdown={commissionBreakdown}
              estimatedCommission={estimatedCommission}
              currency={currency}
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
              <CardTitle className="text-base">Previa da venda</CardTitle>
            </CardHeader>
            <CardContent>
              <SaleSummary
                filledCustomers={filledCustomers}
                productName={productName}
                releaseDate={releaseDate}
                configuredPayments={configuredPayments}
                commissionBreakdown={commissionBreakdown}
                estimatedCommission={estimatedCommission}
                currency={currency}
                careerPlanName={profile?.careerPlan?.name}
                showCommissionRateWarning
                getFeeRate={getFeeRate}
                paymentGrossValue={paymentGrossValue}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NewSaleFeature;
