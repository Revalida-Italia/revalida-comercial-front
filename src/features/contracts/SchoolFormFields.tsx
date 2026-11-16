import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import type { SchoolContractPayload, SchoolStudent } from "@/services/contractsApi";
import { DateField } from "@/features/contracts/DateField";
import { formatCpf } from "@/features/contracts/cpf";
import { formatPhone, newStudent, schoolIncludedLabels } from "@/features/contracts/contractFormModel";
import { Field, SectionHeading, errorId, type FormControl } from "@/features/contracts/contractFormParts";

type Props = {
  payload: SchoolContractPayload;
  update: (change: (draft: SchoolContractPayload) => SchoolContractPayload) => void;
  form: FormControl;
};

type TextProp = "fullName" | "nationality" | "cpf" | "email" | "phone";

function fieldHelpers(form: FormControl) {
  const text = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    options?: { className?: string; inputMode?: "email" | "tel" | "numeric"; format?: (v: string, prev: string) => string; placeholder?: string; type?: string },
  ) => {
    const error = form.error(id);
    return (
      <Field id={id} label={label} error={error} className={options?.className}>
        <Input
          id={id}
          type={options?.type}
          value={value}
          disabled={form.disabled}
          inputMode={options?.inputMode}
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
  };

  const date = (
    id: string,
    label: string,
    value: string,
    onChange: (iso: string) => void,
    range?: { fromYear: number; toYear: number },
  ) => {
    const error = form.error(id);
    return (
      <Field id={id} label={label} error={error}>
        <DateField
          id={id}
          value={value}
          onChange={onChange}
          onBlur={() => form.touch(id)}
          invalid={Boolean(error)}
          describedBy={error ? errorId(id) : undefined}
          disabled={form.disabled}
          {...range}
        />
      </Field>
    );
  };

  return { text, date };
}

function StudentFields({
  student,
  index,
  total,
  update,
  form,
}: {
  student: SchoolStudent;
  index: number;
  total: number;
  update: Props["update"];
  form: FormControl;
}) {
  const { text } = fieldHelpers(form);
  const base = `contract-school-${index}`;
  const patch = (change: Partial<SchoolStudent>) =>
    update((p) => ({ ...p, students: p.students.map((s, i) => (i === index ? { ...s, ...change } : s)) }));
  const field = (prop: TextProp, label: string, options?: Parameters<typeof text>[4]) =>
    text(`${base}-${prop}`, label, student[prop] ?? "", (value) => patch({ [prop]: value }), options);

  return (
    <div className="space-y-4 py-5 first:pt-0 last:pb-0">
      {total > 1 && (
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">{t("contract.student.title", { n: index + 1 })}</h3>
          {index > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              disabled={form.disabled}
              onClick={() => update((p) => ({ ...p, students: p.students.filter((_, i) => i !== index) }))}
            >
              <Trash2 className="h-4 w-4" />
              {t("common.remove")}
              <span className="sr-only"> {t("contract.student.removeWho", { n: index + 1 })}</span>
            </Button>
          )}
        </div>
      )}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
        {field("fullName", t("contract.student.fullName"), { className: "sm:col-span-2" })}
        {field("nationality", t("contract.student.nationality"))}
        {field("cpf", t("contract.student.cpf"), {
          inputMode: "numeric",
          format: formatCpf,
          placeholder: t("contract.student.cpfPlaceholder"),
        })}
        {field("email", t("contract.student.email"), { inputMode: "email" })}
        {field("phone", t("contract.student.phone"), {
          inputMode: "tel",
          format: formatPhone,
          placeholder: t("contract.party.phonePlaceholder"),
        })}
      </div>
    </div>
  );
}

export default function SchoolFormFields({ payload, update, form }: Props) {
  const { text, date } = fieldHelpers(form);
  const course = payload.course;
  const setCourse = (change: Partial<SchoolContractPayload["course"]>) =>
    update((p) => ({ ...p, course: { ...p.course, ...change } }));
  const now = new Date().getFullYear();

  return (
    <>
      <section aria-labelledby="contract-student-title">
        <SectionHeading number={1} title={t("contract.sections.students")} id="contract-student-title" />
        <div className="divide-y divide-border/60">
          {payload.students.map((student, index) => (
            <StudentFields
              key={student.id ?? index}
              student={student}
              index={index}
              total={payload.students.length}
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
          onClick={() => update((p) => ({ ...p, students: [...p.students, newStudent()] }))}
        >
          <Plus className="h-4 w-4" />
          {t("contract.student.add")}
        </Button>
      </section>

      <section aria-labelledby="contract-school-included-title">
        <SectionHeading number={2} title={t("contract.sections.included")} id="contract-school-included-title" />
        <ul className="divide-y divide-border/60 border-y border-border/60">
          {schoolIncludedLabels().map((item) => (
            <li key={item} className="py-3.5 text-[15px] font-semibold">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="contract-course-title">
        <SectionHeading number={3} title={t("contract.sections.course")} id="contract-course-title" />
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
          {text(
            "contract-school-durationMonths",
            t("contract.course.months"),
            course.durationMonths ? String(course.durationMonths) : "",
            (value) => setCourse({ durationMonths: Number(value) || 0 }),
            { type: "number", inputMode: "numeric" },
          )}
          {date("contract-school-startDate", t("contract.course.start"), course.startDate, (iso) => setCourse({ startDate: iso }), {
            fromYear: now - 1,
            toYear: now + 5,
          })}
        </div>
      </section>
    </>
  );
}

export function SchoolSignaturesSection({ number, payload, update, form }: Props & { number: number }) {
  const { text } = fieldHelpers(form);
  return (
    <section aria-labelledby="contract-signatures-title">
      <SectionHeading number={number} title={t("contract.sections.signatures")} id="contract-signatures-title" />
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
        {text("contract-reference-city", t("contract.signatures.city"), payload.referenceCity, (referenceCity) =>
          update((p) => ({ ...p, referenceCity })),
        )}
      </div>
    </section>
  );
}
