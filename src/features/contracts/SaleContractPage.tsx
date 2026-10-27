import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, Loader2, Receipt } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { type SaleRecord } from "@/services/commercialApi";
import {
  generateContract,
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
import { mapGenerateError } from "@/features/contracts/contractErrors";
import { focusField, type FormControl } from "@/features/contracts/contractFormParts";
import ContractPaymentSection from "@/features/contracts/ContractPaymentSection";
import ContractSummary, { GenerateBar } from "@/features/contracts/ContractSummary";
import RevalidaFormFields, { ObservationsSection, RevalidaSignaturesSection } from "@/features/contracts/RevalidaFormFields";
import SchoolFormFields, { SchoolSignaturesSection } from "@/features/contracts/SchoolFormFields";
import { useContractRail, useIsDesktop } from "@/features/contracts/useIsDesktop";
import SaleSummaryFromRecord from "@/features/new-sale/SaleSummaryFromRecord";
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
          } catch {
            toast.error(t("contract.page.registeredSendFailed"));
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

const FORM_CARD = "m-0 min-w-0 space-y-10 rounded-lg border-0 bg-card p-6 shadow-[0_4px_24px_rgba(15,40,60,0.07)] sm:p-8";

function SalePreviewDisclosure({ children, className }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("rounded-lg bg-card shadow-[0_4px_24px_rgba(15,40,60,0.07)]", className)}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="inline-flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {t("contract.page.salePreview")}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <section aria-label={t("contract.page.salePreview")} className="border-t border-border px-6 py-4">
          {children}
        </section>
      </CollapsibleContent>
    </Collapsible>
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
  const preview = <SaleSummaryFromRecord saleId={saleId} />;
  const formCard = (
    <fieldset disabled={disabled} className={FORM_CARD}>
      {form}
    </fieldset>
  );

  if (rail) {
    return (
      <div data-layout="rail" className="grid w-full grid-cols-[minmax(0,720px)_minmax(280px,360px)] items-start gap-10">
        {formCard}
        <div className="sticky top-6 flex max-h-[calc(100dvh-6.5rem)] min-h-0 flex-col gap-4 overflow-hidden">
          <div className="shrink-0">{summary}</div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SalePreviewDisclosure>{preview}</SalePreviewDisclosure>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-layout="stack">
      <SalePreviewDisclosure className="mb-8">{preview}</SalePreviewDisclosure>
      <div className={cn("grid gap-8", summary && "xl:grid-cols-[minmax(0,720px)_320px] xl:items-start xl:gap-10")}>
        {formCard}
        {summary ? <div className="xl:sticky xl:top-6">{summary}</div> : null}
      </div>
      {bar}
    </div>
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
  const rail = useContractRail();
  const [state, setState] = useState<RevalidaFormState>(() => createInitialRevalidaState(prefill));
  const total = paymentTotal(prefill.phases, prefill.totalAmount ?? 0);
  const currency = prefill.currency ?? "BRL";

  const issues = useMemo(
    () => validateRevalidaForm(state, catalog, { phases: prefill.phases }),
    [state, catalog, prefill.phases],
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
    const built = buildRevalidaPayload(prefill, state);
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

  const summary = buildRevalidaSummary(state, catalog);
  const paymentError = feedback.errorFor("contract-section-payment");

  return (
    <>
      <ContractLayout
        saleId={saleId}
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
            contained={rail}
            onGenerate={onGenerate}
          />
        }
      />
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
}: {
  saleId: string;
  prefill: SchoolContractPayload;
  onDirty: () => void;
}) {
  const isDesktop = useIsDesktop();
  const rail = useContractRail();
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
            contained={rail}
            onGenerate={onGenerate}
          />
        }
      />
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
  } else if (!prefill || prefillQuery.isFetching || (productType === "PROGRAMA_REVALIDA_ITALIA" && !catalog)) {
    body = <LoadingState saleId={saleId} />;
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
    body = <LoadingState saleId={saleId} />;
  }

  const otherModel: ContractProductType =
    productType === "PROGRAMA_REVALIDA_ITALIA" ? "ESCOLA_DE_ITALIANO" : "PROGRAMA_REVALIDA_ITALIA";

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
