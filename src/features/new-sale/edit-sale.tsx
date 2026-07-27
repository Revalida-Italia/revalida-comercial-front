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
import { listProducts } from "@/services/productsApi";
import { listUsers, searchUsers } from "@/services/usersApi";
import { buildCommissionBreakdown, normalizeCommissionRate } from "@/services/commissionApi";
import { getProfile, hasRole } from "@/lib/session";
import {
  DEFAULT_SUBSCRIPTION_CYCLE,
  EMPTY_CUSTOMER,
  EMPTY_PAYMENT,
  MAX_INSTALLMENTS,
  STEP_LABELS,
} from "./constants";
import { mapSaleToForm } from "./mapSaleToForm";
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
  const [saleItemsDraft, setSaleItemsDraft] = useState<SaleItemDraft[]>([{ productId: "", releaseDate: "", notes: "" }]);
  const [currency, setCurrency] = useState("BRL");
  const [payments, setPayments] = useState<SalePaymentDraft[]>([{ ...EMPTY_PAYMENT }]);
  const [status, setStatus] = useState<SaleStatus>("PENDING");
  const [soldAt, setSoldAt] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [originalSellerId, setOriginalSellerId] = useState("");
  const [sellerSearchTerm, setSellerSearchTerm] = useState("");
  const [debouncedSellerSearchTerm] = useDebounce(sellerSearchTerm, 300);

  const saleQuery = useQuery({
    queryKey: ["sale", id],
    queryFn: () => getSaleById(id!),
    enabled: Boolean(id),
  });

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  const gatewayFeesQuery = useQuery({
    queryKey: ["gateway-fees"],
    queryFn: () => listGatewayFees(),
    enabled: step >= 3,
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
    setSaleItemsDraft(form.items);
    setPayments(form.payments.length > 0 ? form.payments : [{ ...EMPTY_PAYMENT }]);
    setCurrency(form.currency);
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

  const selectedSaleItems = useMemo(
    () => saleItemsDraft
      .filter((item) => item.productId && item.releaseDate)
      .map((item) => ({
        productId: item.productId,
        releaseDate: item.releaseDate,
        notes: item.notes?.trim() || undefined,
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
      .map((payment) => ({
        gateway: payment.gateway,
        paymentType: payment.paymentType,
        amount: Number(payment.amount),
        totalInstallments: ["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType)
          ? Number(payment.totalInstallments || "1")
          : undefined,
        dueDate: payment.dueDate,
        billingType: payment.billingType,
        ciclo: payment.paymentType === "SUBSCRIPTION"
          ? payment.ciclo || DEFAULT_SUBSCRIPTION_CYCLE
          : undefined,
        feeRate: getFeeRate(payment.gateway, payment.paymentType),
      })),
    [payments, gatewayFeesQuery.data],
  );

  const commissionBreakdown = useMemo(
    () => buildCommissionBreakdown(configuredPayments, commissionRate),
    [configuredPayments, commissionRate],
  );

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

  const canGoStep4 = hasValidPayments;
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

  function updateSaleItem(index: number, field: keyof SaleItemDraft, value: string) {
    setSaleItemsDraft((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addSaleItem() {
    setSaleItemsDraft((prev) => [...prev, { productId: "", releaseDate: "", notes: "" }]);
  }

  function removeSaleItem(index: number) {
    setSaleItemsDraft((prev) => prev.filter((_, i) => i !== index));
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
      if (selectedSaleItems.length === 0 || selectedSaleItems.length !== saleItemsDraft.length) {
        throw new Error("Adicione pelo menos um módulo com data de liberação.");
      }
      if (hasDuplicateProducts) throw new Error("Não é permitido selecionar o mesmo módulo mais de uma vez.");

      await updateSale(id, {
        status,
        ...(soldAt ? { soldAt } : {}),
        ...(isAdmin && sellerId && sellerId !== originalSellerId ? { sellerId } : {}),
        clients: filledCustomers.map((c) => ({
          nameCiphertext: c.name,
          documentCiphertext: c.document ?? "",
          telefone: c.telefone,
          ...(c.email ? { email: c.email } : {}),
        })),
        items: selectedSaleItems,
        payments: payments
          .filter((payment) => Number(payment.amount) > 0 && payment.gateway && payment.paymentType)
          .map((payment) => ({
            type: payment.paymentType,
            gateway: payment.gateway,
            amount: Number(payment.amount),
            dueDate: payment.dueDate || undefined,
            paymentDate: payment.paymentDate || undefined,
            status: payment.status || undefined,
            ...(payment.notes?.trim() ? { notes: payment.notes.trim() } : {}),
            ...(payment.billingType ? { billingType: payment.billingType as BillingType } : {}),
            ...(payment.paymentType === "SUBSCRIPTION" ? { ciclo: payment.ciclo } : {}),
            ...( ["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType)
              ? { totalInstallments: Number(payment.totalInstallments || "1") }
              : {}),
          })),
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
          <Link to="/vendas"><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Link>
        </Button>
        <p className="text-sm text-destructive">
          Erro ao carregar venda: {(saleQuery.error as Error)?.message ?? "Venda não encontrada."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Editar venda</h1>
          <p className="text-muted-foreground">Atualize clientes, produtos, pagamentos e status.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/vendas/${id}`}><ArrowLeft className="mr-1 h-4 w-4" />Voltar ao detalhe</Link>
        </Button>
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
              showNotes
              onUpdateItem={updateSaleItem}
              onAddItem={addSaleItem}
              onRemoveItem={removeSaleItem}
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
              isEditMode
              onCurrencyChange={setCurrency}
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
              saleItems={saleSummaryItems}
              configuredPayments={configuredPayments}
              commissionBreakdown={commissionBreakdown}
              estimatedCommission={commissionBreakdown.totalCommission}
              currency={currency}
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
                estimatedCommission={commissionBreakdown.totalCommission}
                currency={currency}
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
