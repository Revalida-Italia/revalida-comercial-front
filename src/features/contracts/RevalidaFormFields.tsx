import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { RevalidaProduct, RevalidaProductCode } from "@/services/contractsApi";
import { isoToDisplay } from "@/features/contracts/contractDates";
import { DateField } from "@/features/contracts/DateField";
import {
  EXTRAS,
  PRODUCT_ORDER,
  formatPhone,
  newPartyId,
  newPartyKey,
  periodEnd,
  suggestTermEnd,
  type PartyState,
  type ProductState,
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
  /** Day the contract starts (the sale date), when the sale has one. */
  termStart: string | null;
};

function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
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
  const err = (prop: string) => form.error(`${base}-${prop}`);
  const text = (prop: keyof PartyState & string, label: string, extra?: { className?: string; inputMode?: "email" | "tel" | "text"; autoComplete?: string; placeholder?: string; format?: (v: string, prev: string) => string }) => {
    const fieldId = `${base}-${prop}`;
    return (
      <Field id={fieldId} label={label} error={err(prop)} className={extra?.className}>
        <Input
          id={fieldId}
          value={party[prop] as string}
          disabled={form.disabled}
          inputMode={extra?.inputMode}
          autoComplete={extra?.autoComplete ?? "off"}
          placeholder={extra?.placeholder}
          aria-invalid={err(prop) ? true : undefined}
          aria-describedby={err(prop) ? errorId(fieldId) : undefined}
          className={err(prop) ? "border-destructive focus-visible:ring-destructive" : undefined}
          onChange={(event) => {
            const raw = event.target.value;
            patch({ [prop]: extra?.format ? extra.format(raw, party[prop] as string) : raw } as Partial<PartyState>);
          }}
          onBlur={() => form.touch(fieldId)}
        />
      </Field>
    );
  };

  return (
    <div className="space-y-4 py-5 first:pt-0 last:pb-0">
      {total > 1 && (
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">Contratante {index + 1}</h3>
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
              Remover
              <span className="sr-only"> contratante {index + 1}</span>
            </Button>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {text("fullName", "Nome completo", { className: "sm:col-span-2", autoComplete: "name" })}
        {text("document", "Documento")}
        {text("nationality", "Nacionalidade")}
        {text("email", "E-mail", { inputMode: "email", autoComplete: "email" })}
        {text("phone", "Telefone", {
          inputMode: "tel",
          autoComplete: "tel",
          placeholder: "+55 (11) 99999-9999",
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
  monthsPlaceholder,
  form,
}: {
  idBase: string;
  releaseValue: string;
  monthsValue: string;
  onRelease: (iso: string) => void;
  onMonths: (value: string) => void;
  monthsPlaceholder?: string;
  form: FormControl;
}) {
  const releaseId = `${idBase}-release`;
  const durationId = `${idBase}-duration`;
  const end = periodEnd(releaseValue, monthsValue);
  const releaseError = form.error(releaseId);
  const durationError = form.error(durationId);
  return (
    <Expand className="mt-3 grid gap-4 sm:grid-cols-2">
      <Field id={releaseId} label="Liberação" error={releaseError}>
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
        label="Duração (meses)"
        error={durationError}
        hint={end ? `até ${isoToDisplay(end)}` : null}
      >
        <Input
          id={durationId}
          type="number"
          inputMode="numeric"
          min={1}
          max={60}
          placeholder={monthsPlaceholder}
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

export default function RevalidaFormFields({ state, update, catalog, form, termStart }: Props) {
  const inclusionError = form.error("contract-decree-toggle");
  const suggestion = suggestTermEnd(state);
  const termError = form.error("contract-term-end");

  const patchProduct = (code: RevalidaProductCode, change: Partial<ProductState>) =>
    update((s) => ({ ...s, products: { ...s.products, [code]: { ...s.products[code], ...change } } }));

  return (
    <>
      <section aria-labelledby="contract-parties-title">
        <SectionHeading number={1} title="Contratantes" id="contract-parties-title" />
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
          onClick={() =>
            update((s) => ({
              ...s,
              parties: [
                ...s.parties,
                {
                  key: newPartyKey(),
                  id: newPartyId(),
                  fullName: "",
                  document: "",
                  nationality: "Brasileira",
                  email: "",
                  phone: "",
                },
              ],
            }))
          }
        >
          <Plus className="h-4 w-4" />
          Adicionar contratante
        </Button>

        {state.parties.length > 1 && (
          <div className="mt-6">
            <Label className="mb-1.5 block text-sm font-medium">Quem responde pelo pagamento</Label>
            <SegmentedChoice
              label="Quem responde pelo pagamento"
              value={state.liabilityRegime}
              onChange={(liabilityRegime) => update((s) => ({ ...s, liabilityRegime }))}
              disabled={form.disabled}
              options={[
                { value: "INDIVIDUAL", label: "Cada um responde pela sua parte" },
                { value: "JOINT", label: "Todos respondem pelo total" },
              ]}
              className="flex-wrap"
            />
          </div>
        )}
      </section>

      <section aria-labelledby="contract-included-title">
        <SectionHeading number={2} title="O que está incluso" id="contract-included-title" />
        <div className="border-t border-border/60">
          <div className="border-b border-border/60 py-3.5">
            <div className="flex min-h-[40px] items-center justify-between gap-4">
              <label htmlFor="contract-decree-toggle" className="cursor-pointer text-[15px] font-semibold">
                Decreto
              </label>
              <Switch
                id="contract-decree-toggle"
                checked={state.decreeOn}
                disabled={form.disabled}
                aria-describedby={inclusionError ? errorId("contract-decree-toggle") : undefined}
                onCheckedChange={(checked) => update((s) => ({ ...s, decreeOn: checked }))}
              />
            </div>
            {state.decreeOn && (
              <PeriodFields
                idBase="contract-decree"
                releaseValue={state.decreeRelease}
                monthsValue={state.decreeMonths}
                onRelease={(iso) => update((s) => ({ ...s, decreeRelease: iso }))}
                onMonths={(value) => update((s) => ({ ...s, decreeMonths: value }))}
                form={form}
              />
            )}
          </div>

          {PRODUCT_ORDER.map((code) => {
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
                      monthsPlaceholder="Opcional"
                      form={form}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {EXTRAS.map((extra) => (
            <div
              key={extra.key}
              className="flex min-h-[56px] items-center justify-between gap-4 border-b border-border/60 py-2"
            >
              <span className="text-[15px] font-semibold">{extra.label}</span>
              <SegmentedChoice
                label={extra.label}
                value={state.extras[extra.key] ? "yes" : "no"}
                onChange={(value) =>
                  update((s) => ({ ...s, extras: { ...s.extras, [extra.key]: value === "yes" } }))
                }
                disabled={form.disabled}
                options={[
                  { value: "yes", label: "Sim" },
                  { value: "no", label: "Não" },
                ]}
              />
            </div>
          ))}
        </div>
        <FieldError fieldId="contract-decree-toggle" message={inclusionError} />
      </section>

      <section aria-labelledby="contract-term-title">
        <SectionHeading number={3} title="Vigência do contrato" id="contract-term-title" />
        <div className="max-w-xs">
          <Field id="contract-term-end" label="Até" error={termError}>
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
        {suggestion && suggestion !== state.termEnd && (
          <p className="mt-2 text-[13px] text-muted-foreground">
            Sugerido: {isoToDisplay(suggestion)} ·{" "}
            <button
              type="button"
              className="font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={form.disabled}
              onClick={() => update((s) => ({ ...s, termEnd: suggestion }))}
            >
              Usar
            </button>
          </p>
        )}
        {termStart && (
          <p className="mt-2 text-[13px] text-muted-foreground">Início em {isoToDisplay(termStart)}.</p>
        )}
      </section>
    </>
  );
}

export function ObservationsSection({
  number,
  value,
  onChange,
  disabled,
}: {
  number: number;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(value.trim() !== "");
  return (
    <section aria-labelledby="contract-notes-title">
      <SectionHeading number={number} title="Observações" id="contract-notes-title" />
      {open ? (
        <Expand>
          <Label htmlFor="contract-notes" className="sr-only">
            Observações
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
          Adicionar observação
        </Button>
      )}
    </section>
  );
}
