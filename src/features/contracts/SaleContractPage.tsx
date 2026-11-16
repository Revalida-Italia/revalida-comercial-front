import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, FileText, Loader2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import SaleDetailsCard from "@/features/contracts/SaleDetailsCard";
import { type SaleRecord } from "@/services/commercialApi";
import type { CourseContractItem } from "@/services/contractsApi";
import { readCourseItems } from "@/features/new-sale/courses/model";
import {
  generateContract,
  listContractModels,
  listRevalidaProducts,
  prefillContract,
  sendContractForSignature,
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
  schoolIncludedLabels,
  createInitialRevalidaState,
  modelName,
  partyLabel,
  paymentTotal,
  schoolFormFromPrefill,
  studentLabel,
  validateRevalidaForm,
  validateSchoolForm,
  type FormIssue,
  type RevalidaFormState,
} from "@/features/contracts/contractFormModel";
import { mapGenerateError, sendForSignatureErrorMessage } from "@/features/contracts/contractErrors";
import { focusField, type FormControl } from "@/features/contracts/contractFormParts";
import ContractPaymentSection from "@/features/contracts/ContractPaymentSection";
import ContractSummary, { GenerateBar } from "@/features/contracts/ContractSummary";
import RevalidaFormFields, { ObservationsSection, RevalidaSignaturesSection } from "@/features/contracts/RevalidaFormFields";
import SchoolFormFields, { SchoolSignaturesSection } from "@/features/contracts/SchoolFormFields";
import { useContractRail, useContractSplit, useIsDesktop } from "@/features/contracts/useIsDesktop";
import { saleQueryOptions } from "@/features/new-sale/saleQuery";
import { cn } from "@/lib/utils";

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

type RegisterChoice = "only" | "and-send";

function useRegisterFlow(saleId: string, productType: ContractProductType) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const lock = useRef(false);
  const payloadRef = useRef<unknown>(null);
  const onErrorRef = useRef<(error: unknown) => void>(() => {});

  const requestRegister = useCallback((payload: unknown, onError: (error: unknown) => void) => {
    if (lock.current) return;
    payloadRef.current = payload;
    onErrorRef.current = onError;
    setOpen(true);
  }, []);

  const dismiss = useCallback(() => {
    if (lock.current) return;
    setOpen(false);
  }, []);

  const choose = useCallback((choice: RegisterChoice) => {
    if (lock.current) return;
    lock.current = true;
    setGenerating(true);
    void (async () => {
      let registered = false;
      try {
        const created = await generateContract(saleId, payloadRef.current, productType);
        registered = true;
        if (choice === "and-send") {
          try {
            if (!created?.id) throw new Error("missing-contract-id");
            await sendContractForSignature(created.id);
            toast.success(t("contract.page.sent"));
          } catch (error) {
            toast.error(sendForSignatureErrorMessage(error, t("contract.page.registeredSendFailed")));
          }
        } else {
          toast.success(t("contract.page.generated"));
        }
        void queryClient.invalidateQueries({ queryKey: ["sale-contracts", saleId] });
        navigate(`/vendas/${saleId}`, { state: { newContractId: created?.id } });
      } catch (error) {
        onErrorRef.current(error);
      } finally {
        if (!registered) {
          lock.current = false;
          setGenerating(false);
          setOpen(false);
        }
      }
    })();
  }, [navigate, productType, queryClient, saleId]);

  return { open, generating, requestRegister, dismiss, choose };
}

function RegisterSignatureDialog({
  open,
  pending,
  onDismiss,
  onYes,
  onNo,
}: {
  open: boolean;
  pending: boolean;
  onDismiss: () => void;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onDismiss(); }}>
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{t("contract.page.sendTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("contract.page.sendBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              onNo();
            }}
          >
            {t("contract.page.sendNo")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              onYes();
            }}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {t("contract.page.sendYes")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const FORM_CARD = "contract-form m-0 min-w-0 space-y-10 rounded-lg border-0 bg-card p-6 shadow-[0_4px_24px_rgba(15,40,60,0.07)] sm:p-8";

function ModelPaper({ name, onChange }: { name: string; onChange: () => void }) {
  return (
    <div className="model-paper flex flex-wrap items-center gap-4 rounded-md bg-[#F6F1E8] p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-white text-[#2F5679]">
        <FileText className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("contract.page.modelLabel")}</p>
        <p className="text-lg font-bold leading-tight">{name}</p>
      </div>
      <Button type="button" variant="outline" className="model-switch" onClick={onChange}>{t("contract.page.switchModel")}</Button>
    </div>
  );
}

function ContractLayout({
  saleId,
  form,
  summary,
  bar,
  disabled,
}: {
  saleId: string;
  form: ReactNode;
  summary: ReactNode;
  /** Small screens only: the button fixed to the bottom of the screen. */
  bar: ReactNode;
  disabled: boolean;
}) {
  const rail = useContractRail();
  const split = useContractSplit();
  const preview = <SaleDetailsCard saleId={saleId} />;
  const formCard = (
    <fieldset disabled={disabled} className={FORM_CARD}>
      {form}
    </fieldset>
  );

  if (rail) {
    return (
      <div data-layout="rail" className="grid w-full items-start gap-6 min-[1400px]:grid-cols-[minmax(0,1fr)_280px_300px]">
        {formCard}
        <div className="sticky top-6 self-start">{summary}</div>
        {preview}
      </div>
    );
  }

  if (split) {
    return (
      <div data-layout="stack" className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
        {formCard}
        <div className="space-y-4">
          {summary ? <div className="sticky top-6 self-start">{summary}</div> : null}
          {preview}
        </div>
      </div>
    );
  }

  return (
    <div data-layout="stack" className="space-y-6">
      {formCard}
      {preview}
      {summary}
      {bar}
    </div>
  );
}

function RevalidaBody({
  saleId,
  prefill,
  catalog,
  onDirty,
  courseItems,
  modelName,
  onSwitchModel,
}: {
  saleId: string;
  prefill: RevalidaContractPayload;
  catalog: RevalidaProduct[];
  onDirty: () => void;
  courseItems: CourseContractItem[];
  modelName: string;
  onSwitchModel: () => void;
}) {
  const isDesktop = useIsDesktop();
  const rail = useContractRail();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, setState] = useState<RevalidaFormState>(() => {
    const initial = createInitialRevalidaState(prefill);
    if (courseItems.length === 0) return initial;
    const starts = courseItems.map((item) => item.startsAt).filter(Boolean).sort();
    return { ...initial, termStart: starts[0] ?? "", termEnd: "" };
  });
  const total = paymentTotal(prefill.phases, prefill.totalAmount ?? 0);
  const currency = prefill.currency ?? "BRL";
  const courses = courseItems.length > 0 ? courseItems : undefined;

  const issues = useMemo(
    () => validateRevalidaForm(state, catalog, { phases: prefill.phases }, courses),
    [state, catalog, prefill.phases, courses],
  );
  const feedback = useFormFeedback(issues);
  const registration = useRegisterFlow(saleId, "PROGRAMA_REVALIDA_ITALIA");
  const generating = registration.generating;

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
    setConfirmOpen(true);
  };

  const commitGenerate = () => {
    setConfirmOpen(false);
    const built = buildRevalidaPayload(prefill, state, courses);
    registration.requestRegister(built.payload, (error) => {
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

  const summary = buildRevalidaSummary(state, catalog, courses);
  const paymentError = feedback.errorFor("contract-section-payment");

  return (
    <>
      <ContractLayout
        saleId={saleId}
        disabled={generating}
        bar={isDesktop ? null : <GenerateBar issues={feedback.allIssues} generating={generating} onGenerate={onGenerate} modelName={modelName} />}
        form={
          <>
            <ModelPaper name={modelName} onChange={onSwitchModel} />
            <RevalidaFormFields state={state} update={update} catalog={catalog} form={form} courseItems={courses} saleId={saleId} />
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
              included={state.includeNotesInContract}
              disabled={generating}
              onChange={(notes) => update((s) => ({ ...s, notes }))}
              onIncludedChange={(includeNotesInContract) => update((s) => ({ ...s, includeNotesInContract }))}
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
            contained={rail}
            modelName={modelName}
            onChangeModel={onSwitchModel}
            onGenerate={onGenerate}
          />
        }
      />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent overlayClassName="bg-[rgba(36,56,79,0.18)]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("contract.page.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("contract.page.confirmLine", {
                cliente: state.parties[0]?.fullName || t("sales.card.unknownClient"),
                valor: formatCurrency(total, currency),
                n: courses?.length ?? summary.included.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ModelPaper name={modelName} onChange={() => { setConfirmOpen(false); onSwitchModel(); }} />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); commitGenerate(); }}>
              {t("contract.page.confirmGenerate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <RegisterSignatureDialog
        open={registration.open}
        pending={generating}
        onDismiss={registration.dismiss}
        onYes={() => registration.choose("and-send")}
        onNo={() => registration.choose("only")}
      />
    </>
  );
}

function SchoolBody({
  saleId,
  prefill,
  onDirty,
  modelName,
  onSwitchModel,
}: {
  saleId: string;
  prefill: SchoolContractPayload;
  onDirty: () => void;
  modelName: string;
  onSwitchModel: () => void;
}) {
  const isDesktop = useIsDesktop();
  const rail = useContractRail();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [payload, setPayload] = useState<SchoolContractPayload>(() => schoolFormFromPrefill(prefill));
  const issues = useMemo(
    () => validateSchoolForm(payload, { phases: payload.phases }),
    [payload],
  );
  const total = paymentTotal(payload.phases, payload.totalAmount ?? 0);
  const currency = payload.currency ?? "BRL";
  const feedback = useFormFeedback(issues);
  const registration = useRegisterFlow(saleId, "ESCOLA_DE_ITALIANO");
  const generating = registration.generating;

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
    setConfirmOpen(true);
  };

  const commitGenerate = () => {
    setConfirmOpen(false);
    registration.requestRegister(buildSchoolPayload(payload), (error) => {
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
    <>
      <ContractLayout
        saleId={saleId}
        disabled={generating}
        bar={isDesktop ? null : <GenerateBar issues={feedback.allIssues} generating={generating} onGenerate={onGenerate} modelName={modelName} />}
        form={
          <>
            <ModelPaper name={modelName} onChange={onSwitchModel} />
            <SchoolFormFields payload={payload} update={update} form={form} />
            <ContractPaymentSection
              number={4}
              saleId={saleId}
              phases={payload.phases}
              total={total}
              currency={currency}
              error={feedback.errorFor("contract-section-payment")}
            />
            <SchoolSignaturesSection number={5} payload={payload} update={update} form={form} />
            <ObservationsSection
              number={6}
              value={payload.notes ?? ""}
              included={payload.includeNotesInContract === true}
              disabled={generating}
              onChange={(notes) => update((p) => ({ ...p, notes }))}
              onIncludedChange={(includeNotesInContract) => update((p) => ({ ...p, includeNotesInContract }))}
            />
          </>
        }
        summary={
          <ContractSummary
            totalLabel={formatCurrency(total, currency)}
            contractors={tCount("contract.summary.students", payload.students.length)}
            included={schoolIncludedLabels()}
            rows={rows}
            issues={feedback.allIssues}
            banner={feedback.banner}
            generating={generating}
            stickyBar={!isDesktop}
            contained={rail}
            modelName={modelName}
            onChangeModel={onSwitchModel}
            onGenerate={onGenerate}
          />
        }
      />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent overlayClassName="bg-[rgba(36,56,79,0.18)]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("contract.page.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("contract.page.confirmLine", {
                cliente: payload.students[0]?.fullName || t("sales.card.unknownClient"),
                valor: formatCurrency(total, currency),
                n: payload.students.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ModelPaper name={modelName} onChange={() => { setConfirmOpen(false); onSwitchModel(); }} />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); commitGenerate(); }}>
              {t("contract.page.confirmGenerate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <RegisterSignatureDialog
        open={registration.open}
        pending={generating}
        onDismiss={registration.dismiss}
        onYes={() => registration.choose("and-send")}
        onNo={() => registration.choose("only")}
      />
    </>
  );
}

function LoadingState({ saleId }: { saleId: string }) {
  return (
    <ContractLayout
      saleId={saleId}
      disabled
      bar={null}
      summary={<Skeleton className="h-72 w-full rounded-lg" />}
      form={
        <div className="space-y-6" aria-busy="true" aria-label={t("common.loading")}>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-24 w-full" />
        </div>
      }
    />
  );
}

function ErrorState({ saleId, message, onRetry }: { saleId: string; message: string; onRetry: () => void }) {
  return (
    <ContractLayout
      saleId={saleId}
      disabled={false}
      bar={null}
      summary={null}
      form={
        <>
          <p className="mb-4 text-sm">{message}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t("common.retry")}
          </Button>
        </>
      }
    />
  );
}

export default function SaleContractPage() {
  const { id } = useParams<{ id: string }>();
  const saleId = id ?? "";
  const [productType, setProductType] = useState<ContractProductType>("PROGRAMA_REVALIDA_ITALIA");
  const [dirty, setDirty] = useState(false);
  const [pendingModel, setPendingModel] = useState<ContractProductType | null>(null);
  const markDirty = useCallback(() => setDirty(true), []);

  const saleQuery = useQuery(saleQueryOptions(saleId));

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

  const modelsQuery = useQuery({
    queryKey: ["contract-models"],
    queryFn: listContractModels,
    staleTime: 5 * 60 * 1000,
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
      <ErrorState saleId={saleId} message={t("contract.page.loadError")} onRetry={() => void prefillQuery.refetch()} />
    );
  } else if (productType === "PROGRAMA_REVALIDA_ITALIA" && catalogQuery.isError) {
    body = (
      <ErrorState saleId={saleId} message={t("contract.page.productsError")} onRetry={() => void catalogQuery.refetch()} />
    );
  } else if (saleQuery.isLoading || !prefill || prefillQuery.isFetching || (productType === "PROGRAMA_REVALIDA_ITALIA" && !catalog)) {
    body = <LoadingState saleId={saleId} />;
  } else if (prefill.productType === "PROGRAMA_REVALIDA_ITALIA" && catalog) {
    body = (
      <RevalidaBody
        key={`rev-${prefillQuery.dataUpdatedAt}`}
        saleId={saleId}
        prefill={prefill}
        catalog={catalog}
        onDirty={markDirty}
        courseItems={readCourseItems(sale?.items)}
        modelName={prefill.contractModel?.name ?? modelsQuery.data?.find((model) => model.productType === "PROGRAMA_REVALIDA_ITALIA")?.name ?? modelName("PROGRAMA_REVALIDA_ITALIA")}
        onSwitchModel={() => {
          if (dirty) setPendingModel("ESCOLA_DE_ITALIANO");
          else switchModel("ESCOLA_DE_ITALIANO");
        }}
      />
    );
  } else if (prefill.productType === "ESCOLA_DE_ITALIANO") {
    body = (
      <SchoolBody
        key={`esc-${prefillQuery.dataUpdatedAt}`}
        saleId={saleId}
        prefill={prefill}
        onDirty={markDirty}
        modelName={prefill.contractModel?.name ?? modelsQuery.data?.find((model) => model.productType === "ESCOLA_DE_ITALIANO")?.name ?? modelName("ESCOLA_DE_ITALIANO")}
        onSwitchModel={() => {
          if (dirty) setPendingModel("PROGRAMA_REVALIDA_ITALIA");
          else switchModel("PROGRAMA_REVALIDA_ITALIA");
        }}
      />
    );
  } else {
    body = <LoadingState saleId={saleId} />;
  }

  const rail = useContractRail();

  return (
    <div className={cn("pb-6", rail ? "w-full" : "mx-auto max-w-[1120px]")}>
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
        {prefillQuery.isFetching && !prefillQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>

      {body}

      <AlertDialog open={pendingModel !== null} onOpenChange={(open) => !open && setPendingModel(null)}>
        <AlertDialogContent overlayClassName="bg-[rgba(36,56,79,0.18)]">
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
