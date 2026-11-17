import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/i18n";
import type { CourseContractItem, RevalidaProduct, RevalidaProductCode } from "@/services/contractsApi";
import { durationLabel, rangeLabel } from "@/features/new-sale/courses/copy";
import { isoToDisplay } from "@/features/contracts/contractDates";
import { DateField } from "@/features/contracts/DateField";
import {
  EXTRA_KEYS,
  INCLUDED_FIELD_ID,
  MAX_MONTHS,
  PRODUCT_ORDER,
  PROFESSIONS,
  extraLabel,
  formatPhone,
  newPartyState,
  periodEnd,
  professionChoice,
  suggestTermEnd,
  type PartyState,
  type ProductState,
  type ProfessionChoice,
  type RevalidaFormState,
} from "@/features/contracts/contractFormModel";
import {
  Expand,
  Field,
  FieldError,
  SectionHeading,
  SegmentedChoice,
  errorId,
  type FormControl,
} from "@/features/contracts/contractFormParts";

type Props = {
  state: RevalidaFormState;
  update: (change: (draft: RevalidaFormState) => RevalidaFormState) => void;
  catalog: RevalidaProduct[];
  form: FormControl;
  courseItems?: CourseContractItem[];
  saleId?: string;
};

function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

type TextOptions = {
  className?: string;
  inputMode?: "email" | "tel" | "text";
  autoComplete?: string;
  placeholder?: string;
  format?: (value: string, previous: string) => string;
};

/** Text input with label, error and touch handling. */
function TextField({
  id,
  label,
  value,
  onChange,
  form,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  form: FormControl;
  options?: TextOptions;
}) {
  const error = form.error(id);
  return (
    <Field id={id} label={label} error={error} className={options?.className}>
      <Input
        id={id}
        value={value}
        disabled={form.disabled}
        inputMode={options?.inputMode}
        autoComplete={options?.autoComplete ?? "off"}
        placeholder={options?.placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId(id) : undefined}
        className={error ? "border-destructive focus-visible:ring-destructive" : undefined}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(options?.format ? options.format(raw, value) : raw);
        }}
        onBlur={() => form.touch(id)}
      />
    </Field>
  );
}

function ProfessionField({
  party,
  base,
  patch,
  form,
}: {
  party: PartyState;
  base: string;
  patch: (change: Partial<PartyState>) => void;
  form: FormControl;
}) {
  const choice: ProfessionChoice = party.professionIsOther ? "other" : professionChoice(party.profession);
  const fieldId = `${base}-profession`;
  const error = form.error(fieldId);
  return (
    <div className="contract-span">
      <Label className="mb-1.5 block text-sm font-medium">{t("contract.party.profession")}</Label>
      <SegmentedChoice<ProfessionChoice>
        label={t("contract.party.profession")}
        value={choice}
        disabled={form.disabled}
        className="flex-wrap"
        options={[
          ...PROFESSIONS.map((option) => ({ value: option.id, label: t(`contract.profession.${option.id}`) })),
          { value: "other" as const, label: t("contract.profession.other") },
        ]}
        onChange={(next) => {
          if (next === "other") {
            patch({ professionIsOther: true, profession: "" });
            return;
          }
          const option = PROFESSIONS.find((item) => item.id === next);
          if (option) patch({ professionIsOther: false, profession: option.value });
        }}
      />
      {choice === "other" ? (
        <Expand className="mt-3 sm:max-w-sm">
          <TextField
            id={fieldId}
            label={t("contract.party.professionOther")}
            value={party.profession}
            onChange={(profession) => patch({ profession })}
            form={form}
          />
        </Expand>
      ) : (
        <FieldError fieldId={fieldId} message={error} />
      )}
    </div>
  );
}

function PartyFields({
  party,
  index,
  total,
  update,
  form,
}: {
  party: PartyState;
  index: number;
  total: number;
  update: Props["update"];
  form: FormControl;
}) {
  const base = `contract-party-${index}`;
  const patch = (change: Partial<PartyState>) =>
    update((s) => ({
      ...s,
      parties: s.parties.map((p, i) => (i === index ? { ...p, ...change } : p)),
    }));
  const text = (prop: "fullName" | "document" | "nationality" | "email" | "phone", label: string, options?: TextOptions) => (
    <TextField
      id={`${base}-${prop}`}
      label={label}
      value={party[prop]}
      onChange={(value) => patch({ [prop]: value })}
      form={form}
      options={options}
    />
  );

  return (
    <div className="space-y-4 py-5 first:pt-0 last:pb-0">
      {total > 1 && (
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">{t("contract.party.title", { n: index + 1 })}</h3>
          {index > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              disabled={form.disabled}
              onClick={() => update((s) => ({ ...s, parties: s.parties.filter((_, i) => i !== index) }))}
            >
              <Trash2 className="h-4 w-4" />
              {t("common.remove")}
              <span className="sr-only"> {t("contract.party.removeWho", { n: index + 1 })}</span>
            </Button>
          )}
        </div>
      )}
      <div className="contract-fields grid min-w-0">
        {text("fullName", t("contract.party.fullName"), { className: "contract-span", autoComplete: "name" })}
        {text("document", t("contract.party.document"))}
        {text("nationality", t("contract.party.nationality"))}
        <ProfessionField party={party} base={base} patch={patch} form={form} />
        {text("email", t("contract.party.email"), { inputMode: "email", autoComplete: "email" })}
        {text("phone", t("contract.party.phone"), {
          inputMode: "tel",
          autoComplete: "tel",
          placeholder: t("contract.party.phonePlaceholder"),
          format: formatPhone,
        })}
      </div>
    </div>
  );
}

function PeriodFields({
  idBase,
  releaseValue,
  monthsValue,
  onRelease,
  onMonths,
  form,
}: {
  idBase: string;
  releaseValue: string;
  monthsValue: string;
  onRelease: (iso: string) => void;
  onMonths: (value: string) => void;
  form: FormControl;
}) {
  const releaseId = `${idBase}-release`;
  const durationId = `${idBase}-duration`;
  const end = periodEnd(releaseValue, monthsValue);
  const releaseError = form.error(releaseId);
  const durationError = form.error(durationId);
  return (
    <Expand className="mt-3 contract-fields grid min-w-0">
      <Field id={releaseId} label={t("contract.included.release")} error={releaseError}>
        <DateField
          id={releaseId}
          value={releaseValue}
          onChange={onRelease}
          onBlur={() => form.touch(releaseId)}
          invalid={Boolean(releaseError)}
          describedBy={releaseError ? errorId(releaseId) : undefined}
          disabled={form.disabled}
        />
      </Field>
      <Field
        id={durationId}
        label={t("contract.included.duration")}
        error={durationError}
        hint={end ? t("contract.included.until", { date: isoToDisplay(end) }) : null}
      >
        <Input
          id={durationId}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_MONTHS}
          value={monthsValue}
          disabled={form.disabled}
          aria-invalid={durationError ? true : undefined}
          aria-describedby={durationError ? errorId(durationId) : undefined}
          className={durationError ? "border-destructive focus-visible:ring-destructive" : undefined}
          onChange={(event) => onMonths(event.target.value)}
          onBlur={() => form.touch(durationId)}
        />
      </Field>
    </Expand>
  );
}

export default function RevalidaFormFields({ state, update, catalog, form, courseItems, saleId }: Props) {
  const inclusionError = form.error(INCLUDED_FIELD_ID);
  const suggestion = suggestTermEnd(state);
  const termError = form.error("contract-term-end");
  const termStartError = form.error("contract-term-start");

  const patchProduct = (code: RevalidaProductCode, change: Partial<ProductState>) =>
    update((s) => ({ ...s, products: { ...s.products, [code]: { ...s.products[code], ...change } } }));

  return (
    <>
      <section aria-labelledby="contract-parties-title">
        <SectionHeading number={1} title={t("contract.sections.parties")} id="contract-parties-title" />
        <div className="divide-y divide-border/60">
          {state.parties.map((party, index) => (
            <PartyFields
              key={party.key}
              party={party}
              index={index}
              total={state.parties.length}
              update={update}
              form={form}
            />
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4 gap-1.5"
          disabled={form.disabled}
          onClick={() => update((s) => ({ ...s, parties: [...s.parties, newPartyState()] }))}
        >
          <Plus className="h-4 w-4" />
          {t("contract.party.add")}
        </Button>
      </section>

      <section aria-labelledby="contract-included-title">
        {courseItems && courseItems.length > 0 ? (
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="contract-included-title" className="flex items-baseline gap-3 text-lg font-semibold text-foreground">
              <span className="text-sm font-medium tabular-nums text-muted-foreground">2</span>
              {t("contract.sections.included")}
            </h2>
            {saleId ? (
              <Link
                to={`/vendas/${saleId}/editar?step=2`}
                className="inline-flex h-11 items-center gap-1 text-[13px] font-semibold text-primary"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                {t("contract.included.editInSale")}
              </Link>
            ) : null}
          </div>
        ) : (
          <SectionHeading number={2} title={t("contract.sections.included")} id="contract-included-title" />
        )}
        <div className="border-t border-border/60">
          {courseItems && courseItems.length > 0 ? (
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="pb-2 pr-2 font-semibold">{t("sale.summary.item")}</th>
                  <th className="pb-2 pr-2 font-semibold">{t("contract.included.available")}</th>
                  <th className="hidden pb-2 font-semibold sm:table-cell">{t("sale.access.duration")}</th>
                </tr>
              </thead>
              <tbody>
                {courseItems.map((item) => (
                  <tr key={`${item.kind}-${item.courseId}-${item.moduleId ?? ""}`} className="border-t border-border/60 align-top">
                    <td className="py-3 pr-2">
                      <p className="font-semibold">{item.kind === "module" ? (item.moduleName || item.courseName) : item.courseName}</p>
                      <p className="text-[12.5px] text-muted-foreground">
                        {item.kind === "course"
                          ? t("sale.courses.wholeCourse")
                          : t("sale.courses.moduleOf", { curso: item.courseName })}
                      </p>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-2 tabular-nums">{rangeLabel(item.startsAt, item.endsAt)}</td>
                    <td className="hidden whitespace-nowrap py-3 tabular-nums sm:table-cell">{durationLabel(item.startsAt, item.endsAt, "short")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {courseItems && courseItems.length > 0 ? null : PRODUCT_ORDER.map((code) => {
            const product = catalog.find((p) => p.code === code);
            const p = state.products[code];
            const toggleId = `contract-product-${code}-toggle`;
            return (
              <div key={code} className="border-b border-border/60 py-3.5">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={toggleId}
                    className="mt-1"
                    checked={p.selected}
                    disabled={form.disabled}
                    aria-describedby={toggleId === INCLUDED_FIELD_ID && inclusionError ? errorId(INCLUDED_FIELD_ID) : undefined}
                    onCheckedChange={(checked) => patchProduct(code, { selected: checked === true })}
                  />
                  <div className="min-w-0 flex-1">
                    <label htmlFor={toggleId} className="cursor-pointer text-[15px] font-semibold">
                      {product?.name ?? code}
                    </label>
                    {product?.description ? (
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">
                        {capitalize(product.description)}
                      </p>
                    ) : null}
                  </div>
                </div>
                {p.selected && (
                  <div className="pl-7">
                    <PeriodFields
                      idBase={`contract-product-${code}`}
                      releaseValue={p.releaseDate}
                      monthsValue={p.durationMonths}
                      onRelease={(iso) => patchProduct(code, { releaseDate: iso })}
                      onMonths={(value) => patchProduct(code, { durationMonths: value })}
                      form={form}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {EXTRA_KEYS.map((key) => (
            <div
              key={key}
              className="flex min-h-[56px] items-center justify-between gap-4 border-b border-border/60 py-2"
            >
              <span className="text-[15px] font-semibold">{extraLabel(key)}</span>
              <SegmentedChoice
                label={extraLabel(key)}
                value={state.extras[key] ? "yes" : "no"}
                onChange={(value) => update((s) => ({ ...s, extras: { ...s.extras, [key]: value === "yes" } }))}
                disabled={form.disabled}
                options={[
                  { value: "yes", label: t("common.yes") },
                  { value: "no", label: t("common.no") },
                ]}
              />
            </div>
          ))}

          <div className="flex min-h-[56px] items-center justify-between gap-4 border-b border-border/60 py-2">
            <span className="text-[15px] font-semibold">{t("contract.included.decree")}</span>
            <SegmentedChoice
              label={t("contract.included.decree")}
              value={state.decreeOn ? "yes" : "no"}
              onChange={(value) => update((s) => ({ ...s, decreeOn: value === "yes" }))}
              disabled={form.disabled}
              options={[
                { value: "yes", label: t("common.yes") },
                { value: "no", label: t("common.no") },
              ]}
            />
          </div>
        </div>
        <FieldError fieldId={INCLUDED_FIELD_ID} message={inclusionError} />
      </section>

      <section aria-labelledby="contract-term-title">
        <SectionHeading number={3} title={t("contract.sections.term")} id="contract-term-title" />
        <div className="contract-fields grid min-w-0">
          <Field id="contract-term-start" label={t("contract.term.start")} error={termStartError}>
            <DateField
              id="contract-term-start"
              value={state.termStart}
              onChange={(iso) => update((s) => ({ ...s, termStart: iso }))}
              onBlur={() => form.touch("contract-term-start")}
              invalid={Boolean(termStartError)}
              describedBy={termStartError ? errorId("contract-term-start") : undefined}
              disabled={form.disabled}
            />
          </Field>
          <Field id="contract-term-end" label={t("contract.term.end")} error={termError}>
            <DateField
              id="contract-term-end"
              value={state.termEnd}
              onChange={(iso) => update((s) => ({ ...s, termEnd: iso }))}
              onBlur={() => form.touch("contract-term-end")}
              invalid={Boolean(termError)}
              describedBy={termError ? errorId("contract-term-end") : undefined}
              disabled={form.disabled}
              toYear={new Date().getFullYear() + 15}
            />
          </Field>
        </div>
        {!(courseItems && courseItems.length > 0) && suggestion && suggestion !== state.termEnd && (
          <p className="mt-2 text-[13px] text-muted-foreground">
            {t("contract.term.suggested", { date: isoToDisplay(suggestion) })} ·{" "}
            <button
              type="button"
              className="font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={form.disabled}
              onClick={() => update((s) => ({ ...s, termEnd: suggestion }))}
            >
              {t("contract.term.useSuggestion")}
            </button>
          </p>
        )}
        {courseItems && courseItems.length > 0 && state.termEnd && state.termStart && state.termEnd > state.termStart
          && courseItems.every((item) => !item.endsAt || state.termEnd >= item.endsAt) ? (
          <p className="mt-2 text-[13px] text-muted-foreground">{t("contract.term.coversAll")}</p>
        ) : null}
      </section>
    </>
  );
}

/** City printed next to the signature date. */
export function RevalidaSignaturesSection({
  number,
  state,
  update,
  form,
}: {
  number: number;
  state: RevalidaFormState;
  update: Props["update"];
  form: FormControl;
}) {
  return (
    <section aria-labelledby="contract-signatures-title">
      <SectionHeading number={number} title={t("contract.sections.signatures")} id="contract-signatures-title" />
      <div className="contract-fields grid min-w-0">
        <TextField
          id="contract-reference-city"
          label={t("contract.signatures.city")}
          value={state.referenceCity}
          onChange={(referenceCity) => update((s) => ({ ...s, referenceCity }))}
          form={form}
          options={{ autoComplete: "address-level2" }}
        />
      </div>
    </section>
  );
}

export function ObservationsSection({
  number,
  value,
  included,
  onChange,
  onIncludedChange,
  disabled,
}: {
  number: number;
  value: string;
  included: boolean;
  onChange: (value: string) => void;
  onIncludedChange: (included: boolean) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(value.trim() !== "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const title = t("contract.sections.notes");

  return (
    <section aria-labelledby="contract-notes-title">
      <SectionHeading number={number} title={title} id="contract-notes-title" />
      <div className="mb-4 flex min-h-[56px] items-center justify-between gap-4">
        <label htmlFor="contract-notes-include" className="cursor-pointer text-[15px] font-semibold">
          {t("contract.notes.include")}
        </label>
        <Switch
          id="contract-notes-include"
          checked={included}
          disabled={disabled}
          onCheckedChange={(checked) => {
            if (checked) setConfirmOpen(true);
            else onIncludedChange(false);
          }}
        />
      </div>
      {open ? (
        <Expand>
          <Label htmlFor="contract-notes" className="sr-only">
            {title}
          </Label>
          <Textarea
            id="contract-notes"
            rows={4}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
          />
        </Expand>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-3 gap-1.5 text-primary"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
          {t(included ? "contract.notes.addIncluded" : "contract.notes.add")}
        </Button>
      )}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("contract.notes.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("contract.notes.confirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabled}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={disabled} onClick={() => onIncludedChange(true)}>
              {t("contract.notes.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
