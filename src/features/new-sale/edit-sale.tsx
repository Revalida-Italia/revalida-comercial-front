import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getSaleById,
  listGatewayFees,
  updateSale,
  type BillingType,
  type CreateSaleCustomer,
  type SaleStatus,
} from "@/services/commercialApi";
import { listUsers, searchUsers } from "@/services/usersApi";
import { buildCommissionBreakdown, normalizeCommissionRate } from "@/services/commissionApi";
import { fetchExchangeRates } from "@/services/exchangeRatesApi";
import { convertToBrl, isDisplayCurrency } from "@/shared/utils/exchange";
import { getProfile, hasRole } from "@/lib/session";
import {
  DEFAULT_SUBSCRIPTION_CYCLE,
  EMPTY_CUSTOMER,
  EMPTY_PAYMENT,
  MAX_INSTALLMENTS,
} from "./constants";
import { brlAmountForSave, mapSaleToForm } from "./mapSaleToForm";
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
import { LegacyProductsStep } from "./courses/LegacyProductsStep";
import { continueState, draftFromItems, emptyDraft, isLegacySale, readCourseItems, toCourseSaleItems } from "./courses/model";

type PaymentValueLike = {
  amount: string | number;
  paymentType: string;
  totalInstallments?: string | number;
};

function parseStep(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 4) return 1;
  return parsed;
}

const EditSaleFeature = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = getProfile();
  const isAdmin = hasRole("ADMIN");

  const [step, setStep] = useState(() => parseStep(searchParams.get("step")));
  const [initialized, setInitialized] = useState(false);
  const [customers, setCustomers] = useState<CreateSaleCustomer[]>([{ ...EMPTY_CUSTOMER }]);
  const [courseDraft, setCourseDraft] = useState(() => emptyDraft(todayIso()));
  const [payments, setPayments] = useState<SalePaymentDraft[]>([{ ...EMPTY_PAYMENT }]);
  const [status, setStatus] = useState<SaleStatus>("PENDING");
  const [soldAt, setSoldAt] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [originalSellerId, setOriginalSellerId] = useState("");
  const [sellerSearchTerm, setSellerSearchTerm] = useState("");
  const [debouncedSellerSearchTerm] = useDebounce(sellerSearchTerm, 300);

  const needsExchangeRates = useMemo(
    () => payments.some((payment) => payment.inputCurrency !== "BRL"),
    [payments],
  );

  const saleQuery = useQuery({
    queryKey: ["sale", id],
    queryFn: () => getSaleById(id!),
    enabled: Boolean(id),
  });

  const legacy = isLegacySale(saleQuery.data?.items, saleQuery.data?.accessMode);

  const catalogQuery = useQuery({
    queryKey: ["sales", "course-catalog"],
    queryFn: listCourseCatalog,
    enabled: saleQuery.isSuccess && !legacy && step >= 2,
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

  const sellersQuery = useQuery({
    queryKey: ["edit-sale-sellers", debouncedSellerSearchTerm],
    queryFn: () => {
      if (!debouncedSellerSearchTerm.trim()) {
        return listUsers();
      }
      return searchUsers(debouncedSellerSearchTerm);
    },
    enabled: isAdmin && step === 4,
    staleTime: 60_000,
  });

  const sellerOptions = useMemo(
    () => (sellersQuery.data ?? []).filter((user) => user.role === "SELLER" || !user.role),
    [sellersQuery.data],
  );

  useEffect(() => {
    setStep(parseStep(searchParams.get("step")));
  }, [searchParams]);

  useEffect(() => {
    if (!saleQuery.data || initialized) return;

    const form = mapSaleToForm(saleQuery.data);
    setCustomers(form.customers);
    if (!isLegacySale(saleQuery.data.items, saleQuery.data.accessMode)) {
      const next = draftFromItems(readCourseItems(saleQuery.data.items), form.soldAt || todayIso());
      setCourseDraft({
        ...next,
        services: {
          translation: saleQuery.data.translationIncluded === true,
          apostille: saleQuery.data.apostilleIncluded === true,
          postal: saleQuery.data.postalExpensesIncluded === true,
          decree: saleQuery.data.decreeIncluded === true,
        },
      });
    }
    setPayments(form.payments.length > 0 ? form.payments : [{ ...EMPTY_PAYMENT }]);
    setStatus(form.status);
    setSoldAt(form.soldAt);
    setSellerId(form.sellerId);
    setOriginalSellerId(form.sellerId);
    setInitialized(true);
  }, [saleQuery.data, initialized]);

  const commissionRate = useMemo(() => {
    const sellerRate = saleQuery.data?.seller?.careerPlan?.individualCommissionRate;
    const normalizedSellerRate = normalizeCommissionRate(sellerRate);
    if (normalizedSellerRate > 0) return normalizedSellerRate;

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
      if (normalized > 0) return normalized;
    }

    return 0;
  }, [profile, saleQuery.data]);

  const catalog = useMemo(() => catalogQuery.data ?? { modules: [], courses: [] }, [catalogQuery.data]);
  const courseItems = useMemo(() => toCourseSaleItems(courseDraft, catalog), [courseDraft, catalog]);
  const courseGate = useMemo(() => continueState(courseDraft, catalog), [courseDraft, catalog]);
  const legacyItems = useMemo(
    () => (saleQuery.data?.items ?? [])
      .filter((item) => item.productId && !item.courseId && item.kind !== "course" && item.kind !== "module")
      .map((item) => ({
        productId: item.productId as string,
        releaseDate: (item.releaseDate ?? "").slice(0, 10),
        ...(item.notes?.trim() ? { notes: item.notes.trim() } : {}),
      })),
    [saleQuery.data],
  );
  const legacySummary = useMemo(
    () => (saleQuery.data?.items ?? [])
      .filter((item) => item.productId)
      .map((item) => ({
        productName: item.product?.name?.trim() || "Produto não identificado",
        releaseDate: (item.releaseDate ?? "").slice(0, 10),
      })),
    [saleQuery.data],
  );

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
    if (typeof feeRate === "string") return Number(feeRate) || 0;
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

  const canGoStep2 = filledCustomers.length > 0;
  const canGoStep3 = legacy ? legacyItems.length > 0 : courseGate.ok;
  const courseSummary = useMemo(
    () => buildCourseSummary(courseDraft, catalog, filledCustomers.map((customer) => customer.name)),
    [courseDraft, catalog, filledCustomers],
  );

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
  const canSubmit = canGoStep2 && canGoStep3 && canGoStep4 && Boolean(id);

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
        return { ...payment, gateway, paymentType: "", generatePaymentLink: false };
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
      if (field === "totalInstallments") return { ...payment, totalInstallments: String(value) };
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

  const mutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("ID da venda não informado.");
      if (configuredPayments.length === 0) throw new Error("Adicione pelo menos um pagamento válido.");
      if (legacy) {
        if (legacyItems.length === 0) throw new Error("Esta venda não tem produtos.");
      } else if (!courseGate.ok || courseItems.length === 0) {
        throw new Error("Escolha os cursos e o período de acesso.");
      }

      if (needsExchangeRates && !exchangeRatesQuery.data?.rates) {
        throw new Error("Cotação indisponível para converter o pagamento para BRL.");
      }

      const originalCurrency = (payments.find((p) => p.inputCurrency && p.inputCurrency !== "BRL")
        ?.inputCurrency ?? "USD") as "USD" | "EUR";
      await updateSale(id, {
        status,
        saveExchange: needsExchangeRates,
        ...(needsExchangeRates ? { originalCurrency } : {}),
        ...(soldAt ? { soldAt } : {}),
        ...(isAdmin && sellerId && sellerId !== originalSellerId ? { sellerId } : {}),
        clients: filledCustomers.map((c) => ({
          nameCiphertext: c.name,
          documentCiphertext: c.document ?? "",
          telefone: c.telefone,
          ...(c.email ? { email: c.email } : {}),
        })),
        items: legacy ? legacyItems : courseItems,
        ...(!legacy ? {
          translationIncluded: courseDraft.services.translation,
          apostilleIncluded: courseDraft.services.apostille,
          postalExpensesIncluded: courseDraft.services.postal,
          decreeIncluded: courseDraft.services.decree,
        } : {}),
        payments: payments
          .filter((payment) => Number(payment.amount) > 0 && payment.gateway && payment.paymentType)
          .map((payment) => {
            const rawAmount = Number(payment.amount);
            const inputCurrency = payment.inputCurrency || "BRL";
            const amountInBrl = brlAmountForSave(payment, exchangeRatesQuery.data?.rates);

            return {
              type: payment.paymentType,
              gateway: payment.gateway,
              amount: amountInBrl,
              ...(needsExchangeRates && inputCurrency === originalCurrency ? { originalAmount: rawAmount } : {}),
              dueDate: payment.dueDate || undefined,
              paymentDate: payment.paymentDate || undefined,
              status: payment.status || undefined,
              ...(payment.notes?.trim() ? { notes: payment.notes.trim() } : {}),
              ...(payment.billingType ? { billingType: payment.billingType as BillingType } : {}),
              ...(payment.paymentType === "SUBSCRIPTION" ? { ciclo: payment.ciclo } : {}),
              ...(["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType)
                ? { totalInstallments: Number(payment.totalInstallments || "1") }
                : {}),
            };
          }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["sale", id] });
      toast.success("Venda atualizada com sucesso.");
      navigate(`/vendas/${id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar venda.");
    },
  });

  if (saleQuery.isLoading || !initialized) {
    return <p className="text-sm text-muted-foreground">Carregando venda...</p>;
  }

  if (saleQuery.isError || !saleQuery.data) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Link>
        </Button>
        <p className="text-sm text-destructive">
          Erro ao carregar venda: {(saleQuery.error as Error)?.message ?? "Venda não encontrada."}
        </p>
      </div>
    );
  }

  const stepLabels = ["Clientes", legacy ? "Produto" : t("sale.steps.coursesServices"), "Pagamentos", "Resumo"];

  return (
    <div className={cn("space-y-6", step === 2 && !legacy && "max-md:pb-24")}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Editar venda</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/vendas/${id}`}><ArrowLeft className="mr-1 h-4 w-4" />Voltar ao detalhe</Link>
        </Button>
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

          {step === 2 && legacy && (
            <LegacyProductsStep
              items={(saleQuery.data.items ?? []).filter((item) => item.productId)}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 2 && !legacy && (
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
              isEditMode
              exchangeRates={exchangeRatesQuery.data?.rates}
              ratesStale={Boolean(exchangeRatesQuery.data?.stale)}
              rateDate={exchangeRatesQuery.data?.rateDate}
              ratesLoading={exchangeRatesQuery.isLoading || exchangeRatesQuery.isFetching}
              ratesError={exchangeRatesQuery.isError}
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
              saleItems={legacy ? legacySummary : []}
              courseSummary={legacy ? undefined : courseSummary}
              onEditStep={legacy ? undefined : setStep}
              configuredPayments={configuredPayments}
              commissionBreakdown={commissionBreakdown}
              estimatedCommission={commissionBreakdown.totalCommission}
              currency="BRL"
              careerPlanName={saleQuery.data.seller?.careerPlan?.name}
              canSubmit={canSubmit}
              isSaving={mutation.isPending}
              isEditMode
              status={status}
              soldAt={soldAt}
              sellerId={sellerId}
              sellerOptions={sellerOptions}
              sellersLoading={sellersQuery.isLoading}
              showSellerSelect={isAdmin}
              onStatusChange={setStatus}
              onSoldAtChange={setSoldAt}
              onSellerIdChange={setSellerId}
              onSellerSearchChange={setSellerSearchTerm}
              sellerSearchTerm={sellerSearchTerm}
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
                saleItems={legacy ? legacySummary : []}
                courseSummary={legacy ? undefined : courseSummary}
                courseLayout="compact"
                configuredPayments={configuredPayments}
                commissionBreakdown={commissionBreakdown}
                estimatedCommission={commissionBreakdown.totalCommission}
                currency="BRL"
                careerPlanName={saleQuery.data.seller?.careerPlan?.name}
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

export default EditSaleFeature;
