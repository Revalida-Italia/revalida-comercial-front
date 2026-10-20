import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getSaleById, type SaleRecord } from "@/services/commercialApi";
import {
  generateContract,
  listRevalidaProducts,
  prefillContract,
  type ContractProductType,
  type RevalidaContractPayload,
  type RevalidaProduct,
  type SchoolContractPayload,
} from "@/services/contractsApi";
import { t, tCount } from "@/i18n";
import { formatCurrency } from "@/shared/utils/format";
import {
  buildRevalidaPayload,
  buildRevalidaSummary,
  buildSchoolPayload,
  buildSchoolSummaryRows,
  createInitialRevalidaState,
  modelName,
  partyLabel,
  paymentTotal,
  studentLabel,
  validateRevalidaForm,
  validateSchoolForm,
  type FormIssue,
  type RevalidaFormState,
} from "@/features/contracts/contractFormModel";
import { mapGenerateError } from "@/features/contracts/contractErrors";
import { focusField, type FormControl } from "@/features/contracts/contractFormParts";
import ContractPaymentSection from "@/features/contracts/ContractPaymentSection";
import ContractSummary, { GenerateBar } from "@/features/contracts/ContractSummary";
import RevalidaFormFields, { ObservationsSection, RevalidaSignaturesSection } from "@/features/contracts/RevalidaFormFields";
import SchoolFormFields, { SchoolSignaturesSection } from "@/features/contracts/SchoolFormFields";
import { useIsDesktop } from "@/features/contracts/useIsDesktop";

export function saleClientsLabel(sale: SaleRecord | undefined): string {
  const names = (sale?.clients ?? []).map((c) => c.nameCiphertext?.trim()).filter(Boolean);
  if (names.length === 0) return "";
  return names.length === 1 ? names[0] : t("contract.page.clientsMore", { first: names[0], count: names.length - 1 });
}

/** Shared by both models: which fields were left, which errors came back, what the button does. */
function useFormFeedback(issues: FormIssue[]) {
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [attempted, setAttempted] = useState(false);
  const [serverIssues, setServerIssues] = useState<FormIssue[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  const allIssues = useMemo(() => {
    const seen = new Set(issues.map((issue) => `${issue.fieldId}`));
    return [...issues, ...serverIssues.filter((issue) => !seen.has(issue.fieldId))];
  }, [issues, serverIssues]);

  const errorFor = useCallback(
    (fieldId: string): string | null => {
      const server = serverIssues.find((issue) => issue.fieldId === fieldId);
      if (server) return server.message;
      const client = issues.find((issue) => issue.fieldId === fieldId);
      if (client && (attempted || touched.has(fieldId))) return client.message;
      return null;
    },
    [serverIssues, issues, attempted, touched],
  );

  const touch = useCallback((fieldId: string) => {
    setTouched((prev) => (prev.has(fieldId) ? prev : new Set(prev).add(fieldId)));
  }, []);

  const clearServer = useCallback(() => {
    setServerIssues([]);
    setBanner(null);
  }, []);

  return { allIssues, errorFor, touch, attempted, setAttempted, serverIssues, setServerIssues, banner, setBanner, clearServer };
}

function useGenerate(saleId: string, productType: ContractProductType) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: unknown) => generateContract(saleId, payload, productType),
  });
  const run = (
    payload: unknown,
    onError: (error: unknown) => void,
  ) =>
    mutation.mutate(payload, {
      onSuccess: (created) => {
        void queryClient.invalidateQueries({ queryKey: ["sale-contracts", saleId] });
        toast.success(t("contract.page.generated"));
        navigate(`/vendas/${saleId}`, { state: { newContractId: created?.id } });
      },
      onError,
    });
  return { run, generating: mutation.isPending };
}

function ContractLayout({
  form,
  summary,
  bar,
  disabled,
}: {
  form: ReactNode;
  summary: ReactNode;
  /** Small screens only: the button fixed to the bottom of the screen. */
  bar: ReactNode;
  disabled: boolean;
}) {
  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,720px)_320px] lg:items-start lg:gap-10">
        <fieldset
          disabled={disabled}
          className="m-0 min-w-0 space-y-10 rounded-lg border-0 bg-card p-6 shadow-[0_4px_24px_rgba(15,40,60,0.07)] sm:p-8"
        >
          {form}
        </fieldset>
        <div className="lg:sticky lg:top-6">{summary}</div>
      </div>
      {bar}
    </>
  );
}

function RevalidaBody({
  saleId,
  prefill,
  catalog,
  onDirty,
}: {
  saleId: string;
  prefill: RevalidaContractPayload;
  catalog: RevalidaProduct[];
  onDirty: () => void;
}) {
  const isDesktop = useIsDesktop();
  const [state, setState] = useState<RevalidaFormState>(() => createInitialRevalidaState(prefill));
  const total = paymentTotal(prefill.phases, prefill.totalAmount ?? 0);
  const currency = prefill.currency ?? "BRL";

  const issues = useMemo(
    () => validateRevalidaForm(state, catalog, { phases: prefill.phases }),
    [state, catalog, prefill.phases],
  );
  const feedback = useFormFeedback(issues);
  const { run, generating } = useGenerate(saleId, "PROGRAMA_REVALIDA_ITALIA");

  const update = useCallback(
    (change: (draft: RevalidaFormState) => RevalidaFormState) => {
      setState((prev) => change(prev));
      feedback.clearServer();
      onDirty();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDirty],
  );

  const form: FormControl = {
    error: feedback.errorFor,
    touch: feedback.touch,
    disabled: generating,
  };

  const onGenerate = () => {
    feedback.setAttempted(true);
    if (feedback.allIssues.length > 0) {
      focusField(feedback.allIssues[0].fieldId);
      return;
    }
    const built = buildRevalidaPayload(prefill, state);
    run(built.payload, (error) => {
      const mapped = mapGenerateError(error, {
        productCodes: built.sentProductCodes,
        catalog,
        partyLabels: state.parties.map((party, i) => partyLabel(party, i)),
      });
      feedback.setServerIssues(mapped.issues);
      feedback.setBanner(mapped.banner);
      if (mapped.issues[0]) focusField(mapped.issues[0].fieldId);
    });
  };

  const summary = buildRevalidaSummary(state, catalog);
  const paymentError = feedback.errorFor("contract-section-payment");

  return (
    <ContractLayout
      disabled={generating}
      bar={isDesktop ? null : <GenerateBar issues={feedback.allIssues} generating={generating} onGenerate={onGenerate} />}
      form={
        <>
          <RevalidaFormFields state={state} update={update} catalog={catalog} form={form} />
          <ContractPaymentSection
            number={4}
            saleId={saleId}
            phases={prefill.phases}
            total={total}
            currency={currency}
            error={paymentError}
          />
          <RevalidaSignaturesSection number={5} state={state} update={update} form={form} />
          <ObservationsSection
            number={6}
            value={state.notes}
            disabled={generating}
            onChange={(notes) => update((s) => ({ ...s, notes }))}
          />
        </>
      }
      summary={
        <ContractSummary
          totalLabel={formatCurrency(total, currency)}
          contractors={summary.contractors}
          included={summary.included}
          notIncluded={summary.notIncluded}
          termLabel={summary.term}
          termStartLabel={summary.termStart}
          issues={feedback.allIssues}
          banner={feedback.banner}
          generating={generating}
          stickyBar={!isDesktop}
          onGenerate={onGenerate}
        />
      }
    />
  );
}

function SchoolBody({
  saleId,
  prefill,
  onDirty,
}: {
  saleId: string;
  prefill: SchoolContractPayload;
  onDirty: () => void;
}) {
  const isDesktop = useIsDesktop();
  const [payload, setPayload] = useState<SchoolContractPayload>(prefill);
  const issues = useMemo(
    () => validateSchoolForm(payload, { phases: payload.phases }),
    [payload],
  );
  const total = paymentTotal(payload.phases, payload.totalAmount ?? 0);
  const currency = payload.currency ?? "BRL";
  const feedback = useFormFeedback(issues);
  const { run, generating } = useGenerate(saleId, "ESCOLA_DE_ITALIANO");

  const update = useCallback(
    (change: (draft: SchoolContractPayload) => SchoolContractPayload) => {
      setPayload((prev) => change(prev));
      feedback.clearServer();
      onDirty();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDirty],
  );

  const form: FormControl = { error: feedback.errorFor, touch: feedback.touch, disabled: generating };

  const onGenerate = () => {
    feedback.setAttempted(true);
    if (feedback.allIssues.length > 0) {
      focusField(feedback.allIssues[0].fieldId);
      return;
    }
    run(buildSchoolPayload(payload), (error) => {
      const mapped = mapGenerateError(error, {
        productCodes: [],
        catalog: [],
        partyLabels: [],
        studentLabels: payload.students.map((student, i) => studentLabel(student, i)),
      });
      feedback.setServerIssues(mapped.issues);
      feedback.setBanner(mapped.banner);
      if (mapped.issues[0]) focusField(mapped.issues[0].fieldId);
    });
  };

  const rows = buildSchoolSummaryRows(payload);

  return (
    <ContractLayout
      disabled={generating}
      bar={isDesktop ? null : <GenerateBar issues={feedback.allIssues} generating={generating} onGenerate={onGenerate} />}
      form={
        <>
          <SchoolFormFields payload={payload} update={update} form={form} />
          <ContractPaymentSection
            number={3}
            saleId={saleId}
            phases={payload.phases}
            total={total}
            currency={currency}
            error={feedback.errorFor("contract-section-payment")}
          />
          <SchoolSignaturesSection number={4} payload={payload} update={update} form={form} />
          <ObservationsSection
            number={5}
            value={payload.notes ?? ""}
            disabled={generating}
            onChange={(notes) => update((p) => ({ ...p, notes }))}
          />
        </>
      }
      summary={
        <ContractSummary
          totalLabel={formatCurrency(total, currency)}
          contractors={tCount("contract.summary.students", payload.students.length)}
          rows={rows}
          issues={feedback.allIssues}
          banner={feedback.banner}
          generating={generating}
          stickyBar={!isDesktop}
          onGenerate={onGenerate}
        />
      }
    />
  );
}

function LoadingState() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,720px)_320px]" aria-busy="true" aria-label={t("common.loading")}>
      <div className="space-y-6 rounded-lg bg-card p-8">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg bg-card p-8 shadow-[0_4px_24px_rgba(15,40,60,0.07)]">
      <p className="mb-4 text-sm">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  );
}

export default function SaleContractPage() {
  const { id } = useParams<{ id: string }>();
  const saleId = id ?? "";
  const [productType, setProductType] = useState<ContractProductType>("PROGRAMA_REVALIDA_ITALIA");
  const [dirty, setDirty] = useState(false);
  const [pendingModel, setPendingModel] = useState<ContractProductType | null>(null);
  const markDirty = useCallback(() => setDirty(true), []);

  const saleQuery = useQuery({
    queryKey: ["sale", saleId],
    queryFn: () => getSaleById(saleId),
    enabled: Boolean(saleId),
  });

  const prefillQuery = useQuery({
    queryKey: ["contract-prefill", saleId, productType],
    queryFn: () => prefillContract(saleId, productType),
    enabled: Boolean(saleId),
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const catalogQuery = useQuery({
    queryKey: ["revalida-products"],
    queryFn: listRevalidaProducts,
    staleTime: 5 * 60 * 1000,
    enabled: productType === "PROGRAMA_REVALIDA_ITALIA",
  });

  const switchModel = (next: ContractProductType) => {
    setProductType(next);
    setDirty(false);
    setPendingModel(null);
  };

  const sale = saleQuery.data;
  const clients = saleClientsLabel(sale);
  const prefill = prefillQuery.data;
  const catalog = catalogQuery.data;

  let body: ReactNode;
  if (prefillQuery.isError) {
    body = (
      <ErrorState message={t("contract.page.loadError")} onRetry={() => void prefillQuery.refetch()} />
    );
  } else if (productType === "PROGRAMA_REVALIDA_ITALIA" && catalogQuery.isError) {
    body = (
      <ErrorState message={t("contract.page.productsError")} onRetry={() => void catalogQuery.refetch()} />
    );
  } else if (!prefill || prefillQuery.isFetching || (productType === "PROGRAMA_REVALIDA_ITALIA" && !catalog)) {
    body = <LoadingState />;
  } else if (prefill.productType === "PROGRAMA_REVALIDA_ITALIA" && catalog) {
    body = (
      <RevalidaBody
        key={`rev-${prefillQuery.dataUpdatedAt}`}
        saleId={saleId}
        prefill={prefill}
        catalog={catalog}
        onDirty={markDirty}
      />
    );
  } else if (prefill.productType === "ESCOLA_DE_ITALIANO") {
    body = <SchoolBody key={`esc-${prefillQuery.dataUpdatedAt}`} saleId={saleId} prefill={prefill} onDirty={markDirty} />;
  } else {
    body = <LoadingState />;
  }

  const otherModel: ContractProductType =
    productType === "PROGRAMA_REVALIDA_ITALIA" ? "ESCOLA_DE_ITALIANO" : "PROGRAMA_REVALIDA_ITALIA";

  return (
    <div className="mx-auto max-w-[1120px] pb-6">
      <Link
        to={`/vendas/${saleId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("contract.page.back")}
      </Link>
      <h1 className="mt-3 text-[28px] font-bold leading-tight text-foreground">{t("contract.page.title")}</h1>
      <div className="mb-8 mt-1 flex flex-col gap-y-1 text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
        {saleQuery.isLoading ? <Skeleton className="h-5 w-40" /> : clients ? <span>{clients}</span> : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded text-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {modelName(productType)}
              <span className="text-primary underline underline-offset-4">{t("contract.page.switchModel")}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onSelect={() => {
                if (dirty) setPendingModel(otherModel);
                else switchModel(otherModel);
              }}
            >
              {modelName(otherModel)}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {prefillQuery.isFetching && !prefillQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>

      {body}

      <AlertDialog open={pendingModel !== null} onOpenChange={(open) => !open && setPendingModel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("contract.page.switchTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("contract.page.switchBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingModel && switchModel(pendingModel)}>
              {t("contract.page.switchConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
