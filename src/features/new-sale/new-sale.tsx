import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSale, listGatewayFees, type BillingType, type CreateSaleCustomer } from "@/services/commercialApi";
import { createAsaasPaymentLinkForSale } from "@/services/commercialApi";
import { buildCommissionBreakdown, normalizeCommissionRate } from "@/services/commissionApi";
import { fetchExchangeRates } from "@/services/exchangeRatesApi";
import { convertToBrl, isDisplayCurrency } from "@/shared/utils/exchange";
import { getProfile } from "@/lib/session";
import { canGenerateContracts } from "@/features/contracts/access";
import {
  DEFAULT_SUBSCRIPTION_CYCLE,
  EMPTY_CUSTOMER,
  EMPTY_PAYMENT,
  MAX_INSTALLMENTS,
} from "./constants";
import type { SalePaymentDraft } from "./types";
import ConfirmStep from "./organisms/ConfirmStep";
import CustomersStep from "./organisms/CustomersStep";
import PaymentsStep from "./organisms/PaymentsStep";
import SaleSummary from "@/features/new-sale/organisms/SaleSummary";
import StepIndicator from "./organisms/StepIndicator";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { listCourseCatalog } from "./courses/catalogApi";
import { buildCourseSummary } from "./courses/copy";
import { todayIso } from "./courses/dates";
import { CoursesStep } from "./courses/CoursesStep";
import { continueState, emptyDraft, toCourseSaleItems } from "./courses/model";

type PaymentValueLike = {
  amount: string | number;
  paymentType: string;
  totalInstallments?: string | number;
};

const NewSaleFeature = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = getProfile();

  const [step, setStep] = useState(1);

  const [customers, setCustomers] = useState<CreateSaleCustomer[]>([{ ...EMPTY_CUSTOMER }]);

  const [courseDraft, setCourseDraft] = useState(() => emptyDraft(todayIso()));

  const [payments, setPayments] = useState<SalePaymentDraft[]>([{ ...EMPTY_PAYMENT }]);

  const needsExchangeRates = useMemo(
    () => payments.some((payment) => payment.inputCurrency !== "BRL"),
    [payments],
  );

  const catalogQuery = useQuery({
    queryKey: ["sales", "course-catalog"],
    queryFn: listCourseCatalog,
    enabled: step >= 2,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
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

  const catalog = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data]);
  const courseItems = useMemo(() => toCourseSaleItems(courseDraft, catalog), [courseDraft, catalog]);
  const courseGate = useMemo(() => continueState(courseDraft, catalog), [courseDraft, catalog]);

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

  const courseSummary = useMemo(
    () => buildCourseSummary(courseDraft, catalog, filledCustomers.map((customer) => customer.name)),
    [courseDraft, catalog, filledCustomers],
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
          inputCurrency,
          enteredAmount: rawAmount,
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
  const canGoStep3 = courseGate.ok;

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
  const wantsPaymentLink = useMemo(
    () => payments.some((payment) => payment.gateway === "ASAAS" && payment.generatePaymentLink),
    [payments],
  );

  const paymentLinkClientOk = !wantsPaymentLink || Boolean(filledCustomers[0]?.document?.trim());

  const canGoStep4 = hasValidPayments
    && hasExchangeRatesReady
    && !(needsExchangeRates && exchangeRatesQuery.isError)
    && paymentLinkClientOk;
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

  function setPaymentGateway(index: number, gateway: string, generatePaymentLink: boolean) {
    setPayments((prev) => prev.map((payment, i) => {
      if (i !== index) {
        return payment;
      }

      const gatewayChanged = payment.gateway !== gateway;

      return {
        ...payment,
        gateway,
        paymentType: gatewayChanged ? "" : payment.paymentType,
        generatePaymentLink: gateway === "ASAAS" ? generatePaymentLink : false,
      };
    }));
  }

  function updatePayment(index: number, field: keyof SalePaymentDraft, value: string | boolean) {
    setPayments((prev) => prev.map((payment, i) => {
      if (i !== index) return payment;
      if (field === "gateway") {
        const gateway = String(value);
        return {
          ...payment,
          gateway,
          paymentType: "",
          generatePaymentLink: gateway === "ASAAS" ? payment.generatePaymentLink : false,
        };
      }
      if (field === "generatePaymentLink") {
        return { ...payment, generatePaymentLink: Boolean(value) };
      }
      if (field === "paymentType") {
        const paymentType = String(value);
        return {
          ...payment,
          paymentType,
          totalInstallments: payment.totalInstallments || "1",
          ciclo: paymentType === "SUBSCRIPTION" ? payment.ciclo || DEFAULT_SUBSCRIPTION_CYCLE : DEFAULT_SUBSCRIPTION_CYCLE,
        };
      }
      if (field === "totalInstallments") {
        return { ...payment, totalInstallments: String(value) };
      }
      if (field === "inputCurrency") {
        const currency = String(value);
        return {
          ...payment,
          inputCurrency: isDisplayCurrency(currency) ? currency : "BRL",
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

  function getPayablePaymentDrafts() {
    return payments.filter(
      (payment): payment is SalePaymentDraft & { billingType: BillingType } =>
        Number(payment.amount) > 0 && hasConfiguredBillingType(payment),
    );
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!profile?.sub) {
        throw new Error("Usuario sem sub/externalId no perfil.");
      }

      if (configuredPayments.length === 0) {
        throw new Error("Adicione pelo menos um pagamento valido.");
      }

      if (!courseGate.ok || courseItems.length === 0) {
        throw new Error("Escolha os cursos e o período de acesso.");
      }

      if (needsExchangeRates && !exchangeRatesQuery.data?.rates) {
        throw new Error("Cotação indisponível para converter o pagamento para BRL.");
      }
      if (wantsPaymentLink && !filledCustomers[0]?.document?.trim()) {
        throw new Error("Informe o CPF do cliente para gerar o link de pagamento.");
      }

      const originalCurrency = (payments.find((p) => p.inputCurrency && p.inputCurrency !== "BRL")
        ?.inputCurrency ?? "USD") as "USD" | "EUR";
      const createdSale = await createSale({
        sellerId: profile.sub,
        currency: "BRL",
        saveExchange: needsExchangeRates,
        ...(needsExchangeRates ? { originalCurrency } : {}),
        clients: filledCustomers.map((c) => ({
          nameCiphertext: c.name,
          documentCiphertext: c.document ?? "",
          telefone: c.telefone,
          ...(c.email ? { email: c.email } : {}),
        })),
        items: courseItems,
        payments: configuredPayments.map((payment) => ({
          gateway: payment.gateway,
          type: payment.paymentType,
          amount: payment.amount,
          ...(needsExchangeRates && payment.inputCurrency === originalCurrency
            ? { originalAmount: payment.enteredAmount }
            : {}),
          dueDate: payment.dueDate,
          billingType: payment.billingType,
          ...(payment.ciclo ? { ciclo: payment.ciclo } : {}),
          ...(payment.totalInstallments ? { totalInstallments: payment.totalInstallments } : {}),
        })),
      });

      const payableDrafts = getPayablePaymentDrafts();
      const primaryClient = filledCustomers[0];

      for (let index = 0; index < payableDrafts.length; index += 1) {
        const draft = payableDrafts[index];
        const createdPayment = createdSale.payments[index];

        if (!draft.generatePaymentLink || draft.gateway !== "ASAAS" || !createdPayment?.id) {
          continue;
        }

        await createAsaasPaymentLinkForSale(createdSale.id, createdPayment.id, {
          type: draft.paymentType,
          amount: Number(draft.amount),
          billingType: draft.billingType,
          dueDate: draft.dueDate,
          client: {
            nome: primaryClient.name,
            cpf: primaryClient.document?.trim() ?? "",
            telefone: primaryClient.telefone,
            ...(primaryClient.email ? { email: primaryClient.email } : {}),
          },
          ...(draft.paymentType === "SUBSCRIPTION"
            ? { ciclo: draft.ciclo || DEFAULT_SUBSCRIPTION_CYCLE }
            : {}),
          ...(["INSTALLMENT", "SUBSCRIPTION"].includes(draft.paymentType)
            ? { totalInstallments: Number(draft.totalInstallments || "1") }
            : {}),
        });
      }

      return createdSale;
    },
    onSuccess: async (createdSale) => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      const message = wantsPaymentLink
        ? "Venda criada e link de pagamento gerado com sucesso."
        : "Venda criada com sucesso.";
      toast.success(message);
      if (createdSale?.id && canGenerateContracts()) {
        navigate(`/vendas/${createdSale.id}/contrato`);
        return;
      }
      setStep(1);
      setCustomers([{ ...EMPTY_CUSTOMER }]);
      setCourseDraft(emptyDraft(todayIso()));
      setPayments([{ ...EMPTY_PAYMENT }]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao criar venda.");
    },
  });

  const stepLabels = ["Clientes", t("sale.steps.courses"), "Pagamentos", "Resumo"];

  return (
    <div className={cn("space-y-6", step === 2 && "max-md:pb-24")}>
      <div>
        <h1 className="text-3xl font-bold text-foreground">Nova venda</h1>
      </div>

      <StepIndicator labels={stepLabels} step={step} />

      <div className="grid min-w-0 items-start gap-6 min-[1181px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
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
            <CoursesStep
              catalog={catalog}
              loading={(catalogQuery.isLoading || catalogQuery.isFetching) && !catalogQuery.data}
              error={catalogQuery.isError}
              onRetry={() => { void catalogQuery.refetch(); }}
              draft={courseDraft}
              onChange={setCourseDraft}
              clients={filledCustomers.map((customer) => customer.name)}
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
              customerHasDocument={Boolean(filledCustomers[0]?.document?.trim())}
              onUpdatePayment={updatePayment}
              onSetPaymentGateway={setPaymentGateway}
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
              saleItems={[]}
              configuredPayments={configuredPayments}
              commissionBreakdown={commissionBreakdown}
              estimatedCommission={estimatedCommission}
              currency="BRL"
              careerPlanName={profile?.careerPlan?.name}
              courseSummary={courseSummary}
              onEditStep={setStep}
              canSubmit={canSubmit}
              isSaving={mutation.isPending}
              onBack={() => setStep(3)}
              onSubmit={() => mutation.mutate()}
              getFeeRate={getFeeRate}
              paymentGrossValue={paymentGrossValue}
            />
          )}
        </div>

        <div className="max-md:hidden">
          <Card className="min-[1181px]:sticky min-[1181px]:top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Prévia da venda</CardTitle>
            </CardHeader>
            <CardContent>
              <SaleSummary
                filledCustomers={filledCustomers}
                saleItems={[]}
                courseSummary={courseSummary}
                courseLayout="compact"
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
