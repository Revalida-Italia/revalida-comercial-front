import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SchoolContractPayload } from "@/services/contractsApi";
import { DateField } from "@/features/contracts/DateField";
import { formatPhone } from "@/features/contracts/contractFormModel";
import { Field, SectionHeading, errorId, type FormControl } from "@/features/contracts/contractFormParts";

type Props = {
  payload: SchoolContractPayload;
  update: (change: (draft: SchoolContractPayload) => SchoolContractPayload) => void;
  form: FormControl;
};

export default function SchoolFormFields({ payload, update, form }: Props) {
  const student = payload.student;
  const course = payload.course;
  const setStudent = (change: Partial<SchoolContractPayload["student"]>) =>
    update((p) => ({ ...p, student: { ...p.student, ...change } }));
  const setCourse = (change: Partial<SchoolContractPayload["course"]>) =>
    update((p) => ({ ...p, course: { ...p.course, ...change } }));

  const text = (
    prop: keyof SchoolContractPayload["student"],
    label: string,
    options?: { className?: string; inputMode?: "email" | "tel"; format?: (v: string, prev: string) => string; placeholder?: string },
  ) => {
    const id = `contract-school-${prop}`;
    const error = form.error(id);
    return (
      <Field id={id} label={label} error={error} className={options?.className}>
        <Input
          id={id}
          value={(student[prop] as string | null | undefined) ?? ""}
          disabled={form.disabled}
          inputMode={options?.inputMode}
          placeholder={options?.placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId(id) : undefined}
          className={error ? "border-destructive focus-visible:ring-destructive" : undefined}
          onChange={(event) => {
            const raw = event.target.value;
            setStudent({
              [prop]: options?.format ? options.format(raw, (student[prop] as string) ?? "") : raw,
            } as Partial<SchoolContractPayload["student"]>);
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

  const now = new Date().getFullYear();

  return (
    <>
      <section aria-labelledby="contract-student-title">
        <SectionHeading number={1} title="Estudante" id="contract-student-title" />
        <div className="grid gap-4 sm:grid-cols-2">
          {text("fullName", "Nome completo", { className: "sm:col-span-2" })}
          {date("contract-school-birthDate", "Data de nascimento", student.birthDate, (iso) => setStudent({ birthDate: iso }), {
            fromYear: 1930,
            toYear: now,
          })}
          {text("birthPlace", "Local de nascimento")}
          {text("nationality", "Nacionalidade")}
          {text("passport", "Passaporte")}
          {text("fullAddress", "Endereço completo", { className: "sm:col-span-2" })}
          {text("email", "E-mail", { inputMode: "email" })}
          {text("phone", "Telefone", { inputMode: "tel", format: formatPhone, placeholder: "+55 (11) 99999-9999" })}
        </div>
      </section>

      <section aria-labelledby="contract-course-title">
        <SectionHeading number={2} title="Curso" id="contract-course-title" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="contract-school-purpose" label="Finalidade do curso">
            <Select
              value={course.purpose}
              disabled={form.disabled}
              onValueChange={(value) => setCourse({ purpose: value as "LANGUAGE" | "LANGUAGE_STUDY_VISA" })}
            >
              <SelectTrigger id="contract-school-purpose" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LANGUAGE">Aperfeiçoamento linguístico</SelectItem>
                <SelectItem value="LANGUAGE_STUDY_VISA">Visto de estudo</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field id="contract-school-durationMonths" label="Duração (meses)">
            <Input
              id="contract-school-durationMonths"
              type="number"
              min={1}
              value={course.durationMonths}
              disabled={form.disabled}
              onChange={(event) => setCourse({ durationMonths: Number(event.target.value) || 0 })}
            />
          </Field>
          {date("contract-school-startDate", "Início", course.startDate, (iso) => setCourse({ startDate: iso }), {
            fromYear: now - 1,
            toYear: now + 5,
          })}
          {date("contract-school-endDate", "Fim", course.endDate, (iso) => setCourse({ endDate: iso }), {
            fromYear: now - 1,
            toYear: now + 5,
          })}
          <Field id="contract-school-weeklyHours" label="Horas semanais">
            <Input
              id="contract-school-weeklyHours"
              type="number"
              min={1}
              value={course.weeklyHours}
              disabled={form.disabled}
              onChange={(event) => setCourse({ weeklyHours: Number(event.target.value) || 0 })}
            />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-medium">Nível inicial e objetivo</span>
            <div className="flex gap-2">
              <Input
                aria-label="Nível inicial"
                value={course.initialLevel}
                disabled={form.disabled}
                onChange={(event) => setCourse({ initialLevel: event.target.value })}
              />
              <Input
                aria-label="Nível objetivo"
                value={course.targetLevel}
                disabled={form.disabled}
                onChange={(event) => setCourse({ targetLevel: event.target.value })}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
