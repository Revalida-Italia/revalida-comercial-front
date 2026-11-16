import { useState } from "react";
import { AlertCircle, Calendar, Check, Copy, RefreshCw, Search, Users } from "lucide-react";
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
import { t, type MessageKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { AccessDateField } from "./AccessDateField";
import { Thumb } from "./Thumb";
import { durationLabel, itemDetail, rangeLabel, selectedLabel } from "./copy";
import {
  applyMode,
  continueState,
  copyFirstDates,
  courseKey,
  datesDiverge,
  fieldIssue,
  filterCatalog,
  isCourseLocked,
  listItems,
  lockingModules,
  moduleKey,
  setEditing,
  setItemDate,
  setService,
  setSharedDate,
  showFieldIssue,
  toggleCourse,
  toggleModule,
  touchField,
  type CatalogFilter,
} from "./model";
import type { CatalogCourse, CatalogModule, CourseDraft, SaleServices, TeachingCatalog } from "./types";

type Props = {
  catalog: TeachingCatalog;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  draft: CourseDraft;
  onChange: (next: CourseDraft | ((current: CourseDraft) => CourseDraft)) => void;
  clients: string[];
  onBack: () => void;
  onNext: () => void;
};

const SERVICES: Array<{ key: keyof SaleServices; label: MessageKey }> = [
  { key: "translation", label: "sale.services.translation" },
  { key: "apostille", label: "sale.services.apostille" },
  { key: "postal", label: "sale.services.postal" },
  { key: "decree", label: "sale.services.decree" },
];

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const index = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-[#E3ECF4] px-px text-inherit">{text.slice(index, index + q.length)}</mark>
      {text.slice(index + q.length)}
    </>
  );
}

function Box({ on, locked }: { on: boolean; locked?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[4px] bg-white shadow-[inset_0_0_0_1.5px_#9AA7B5]",
        on && !locked && "bg-[#2F5679] text-white shadow-none",
        locked && "bg-[#A9BACB] text-white shadow-none",
      )}
    >
      {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </span>
  );
}

function dateIssue(start: string, end: string, draft: CourseDraft, field: string, short: boolean): string | null {
  const issue = fieldIssue(start, end, showFieldIssue(draft, field));
  if (issue === "required") return t("sale.access.errRequired");
  if (issue === "order") return t(short ? "sale.access.errEndShort" : "sale.access.errEnd");
  return null;
}

function includedLine(catalog: TeachingCatalog, draft: CourseDraft, courseId: string): string | null {
  const owners = lockingModules(catalog, draft, courseId);
  if (owners.length === 0) return null;
  if (owners.length === 1) return t("sale.courses.includedIn", { nome: owners[0].name });
  return t("sale.courses.includedMore", { nome: owners[0].name, n: owners.length - 1 });
}

const ROW =
  "flex min-h-[52px] w-full items-center gap-3 rounded-[0.375rem] px-2 py-1.5 text-left outline-none cursor-pointer hover:bg-[#F3F6F9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2F5679]";

export function CoursesStep({ catalog, loading, error, onRetry, draft, onChange, clients, onBack, onNext }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CatalogFilter>("all");
  const [confirmSame, setConfirmSame] = useState(false);

  const found = filterCatalog(catalog, query);
  const modules = filter === "courses" ? [] : found.modules;
  const courses = filter === "modules" ? [] : found.courses;
  const items = listItems(draft, catalog);
  const moving = continueState(draft, catalog);
  const canNext = moving.ok;
  const reasonId = "course-continue-reason";
  const reason = !canNext
    ? moving.message === "invalid"
      ? t("sale.access.fixToContinue")
      : moving.message === "end"
        ? t("sale.access.endRequired")
        : items.length === 0
          ? t("sale.access.emptyTitle")
          : null
    : null;
  const periodLabel = items.length > 0 && items[0].endsAt > items[0].startsAt
    ? durationLabel(items[0].startsAt, items[0].endsAt, "access")
    : "";
  const note = clients.length > 1 ? t("sale.access.clients", { n: clients.length, nomes: clients.join(` ${t("sale.access.and")} `) }) : null;

  const chooseMode = (mode: "same" | "item") => {
    if (mode === draft.mode) return;
    if (mode === "same" && datesDiverge(draft, catalog)) {
      setConfirmSame(true);
      return;
    }
    onChange(applyMode(draft, mode, catalog));
  };

  const writeShared = (field: "startsAt" | "endsAt", iso: string, source: "type" | "commit") => {
    onChange((current) => {
      const next = setSharedDate(current, field, iso);
      return source === "type" ? setEditing(next, field === "endsAt" ? "shared-end" : "shared-start", true) : next;
    });
  };

  const writeItem = (key: string, field: "startsAt" | "endsAt", iso: string, source: "type" | "commit") => {
    onChange((current) => {
      const next = setItemDate(current, key, field, iso);
      return source === "type" ? setEditing(next, `${key}-${field === "endsAt" ? "end" : "start"}`, true) : next;
    });
  };

  const onRowKey = (event: React.KeyboardEvent, toggle: () => void) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    toggle();
  };

  return (
    <section className="min-w-0">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">{t("sale.courses.title")}</h2>
        <span className="whitespace-nowrap text-[13px] text-[#5D6F83]">{selectedLabel(items.length)}</span>
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7C8A9A]" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("sale.courses.search")}
            aria-label={t("sale.courses.search")}
            className="h-11 w-full rounded-md bg-[#F3F6F9] pl-9 pr-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2F5679]"
          />
        </label>
        <div role="radiogroup" aria-label={t("sale.courses.filterAll")} className="flex shrink-0 rounded-md bg-[#EAEFF4] p-[3px]">
          {([
            ["all", t("sale.courses.filterAll")],
            ["modules", `${t("sale.courses.groupModules")} · ${(catalog.modules ?? []).length}`],
            ["courses", `${t("sale.courses.groupCourses")} · ${(catalog.courses ?? []).length}`],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "h-11 min-w-0 rounded px-2.5 text-[13px] font-semibold text-[#52657A]",
                filter === value && "bg-white text-[#24384F] shadow-[0_1px_2px_rgba(36,56,79,0.08)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div role="status" className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex min-h-[52px] items-center gap-3">
              <span className="h-9 w-14 rounded-[0.375rem] bg-[#EAEFF4]" />
              <span className="h-4 w-40 rounded bg-[#EAEFF4]" />
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-[#F3DEDE] px-4 py-3.5 text-[#9A3F3F]">
          <p className="flex items-center gap-2.5 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("sale.courses.loadError")}
          </p>
          <button type="button" onClick={onRetry} className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-[#2F5679] shadow-[inset_0_0_0_1px_rgba(36,56,79,0.16)]">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t("sale.courses.retry")}
          </button>
        </div>
      ) : null}

      {!loading && !error && query.trim() && modules.length === 0 && courses.length === 0 ? (
        <div className="px-3 py-7 text-center text-[#5D6F83]">
          <Search className="mx-auto mb-2 h-7 w-7 text-[#7C8A9A]" aria-hidden="true" />
          <p className="font-semibold text-[#24384F]">{t("sale.courses.noResults", { q: query.trim() })}</p>
          <p>{t("sale.courses.noResultsHint")}</p>
        </div>
      ) : null}

      {!loading && !error && (modules.length > 0 || courses.length > 0) ? (
        <div>
          {modules.length > 0 ? (
            <div>
              <h2 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5D6F83]">{t("sale.courses.groupModules")}</h2>
              {modules.map((mod) => (
                <ModuleRow key={mod.id} module={mod} catalog={catalog} draft={draft} query={query} onChange={onChange} onRowKey={onRowKey} />
              ))}
            </div>
          ) : null}
          {courses.length > 0 ? (
            <div className={modules.length > 0 ? "mt-4" : ""}>
              <h2 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5D6F83]">{t("sale.courses.groupCourses")}</h2>
              {courses.map((course) => (
                <CourseRow key={course.id} course={course} catalog={catalog} draft={draft} query={query} onChange={onChange} onRowKey={onRowKey} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!loading && !error ? (
      <div className="mt-7 border-t border-[rgba(36,56,79,0.10)] pt-6">
        <div className="mb-3.5 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">{t("sale.access.title")}</h2>
          {items.length > 0 ? <span className="text-[13px] text-[#5D6F83]">{selectedLabel(items.length)}</span> : null}
        </div>
        {items.length === 0 ? (
          <div className="rounded-md bg-[#F3F6F9] px-3 py-4 text-center text-[#5D6F83]">
            <Calendar className="mx-auto mb-2 h-7 w-7 text-[#7C8A9A]" aria-hidden="true" />
            <p className="font-semibold text-[#24384F]">{t("sale.access.emptyTitle")}</p>
            <p>{t("sale.access.emptyBody")}</p>
          </div>
        ) : (
          <>
            <div role="radiogroup" aria-label={t("sale.access.title")} className="mb-4 flex w-full rounded-md bg-[#EAEFF4] p-[3px] md:inline-flex md:w-auto">
              {(["same", "item"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={draft.mode === mode}
                  onClick={() => chooseMode(mode)}
                  className={cn(
                    "h-11 min-w-0 flex-1 rounded px-2 text-center text-[13px] font-semibold leading-tight text-[#52657A] md:flex-none md:px-3.5",
                    draft.mode === mode && "bg-white text-[#24384F] shadow-[0_1px_2px_rgba(36,56,79,0.08)]",
                  )}
                >
                  {t(mode === "same" ? "sale.access.same" : "sale.access.perItem")}
                </button>
              ))}
            </div>
            {draft.mode === "same" ? (
              <div className="rounded-md bg-[#F6F1E8] p-4">
                <div className="grid items-end gap-3 md:grid-cols-[minmax(0,180px)_minmax(0,180px)_1fr]">
                  <AccessDateField
                    id="course-access-start"
                    label={t("sale.access.start")}
                    value={draft.sharedStart}
                    onChange={(iso, source) => writeShared("startsAt", iso, source)}
                    onBlur={() => onChange((current) => touchField(current, "shared-start"))}
                    invalid={Boolean(dateIssue(draft.sharedStart, draft.sharedEnd, draft, "shared-start", false) && !draft.sharedStart)}
                  />
                  <div>
                    <AccessDateField
                      id="course-access-end"
                      label={t("sale.access.end")}
                      value={draft.sharedEnd}
                      onChange={(iso, source) => writeShared("endsAt", iso, source)}
                      onBlur={() => onChange((current) => touchField(current, "shared-end"))}
                      invalid={Boolean(dateIssue(draft.sharedStart, draft.sharedEnd, draft, "shared-end", false))}
                      describedBy={dateIssue(draft.sharedStart, draft.sharedEnd, draft, "shared-end", false) ? "course-access-end-error" : undefined}
                    />
                    {dateIssue(draft.sharedStart, draft.sharedEnd, draft, "shared-end", false) ? (
                      <p id="course-access-end-error" className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[#9A3F3F]">
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        {dateIssue(draft.sharedStart, draft.sharedEnd, draft, "shared-end", false)}
                      </p>
                    ) : null}
                  </div>
                  <p className="pb-2 text-[13px] text-[#5D6F83]">{periodLabel ? <span className="font-semibold text-[#24384F]">{periodLabel}</span> : null}</p>
                </div>
                <p className="mt-3.5 text-[13px] text-[#52657A]">
                  {t("sale.access.appliesTo")}{" "}
                  {items.map((item, index) => (
                    <span key={item.key}>
                      {index > 0 ? " · " : null}
                      <span className="font-semibold text-[#24384F]">{item.name}</span>
                      {` (${itemDetail(item)})`}
                    </span>
                  ))}
                </p>
              </div>
            ) : (
              <ul>
                {items.map((item) => {
                  const endId = `${item.key}-end`;
                  const endMessage = dateIssue(item.startsAt, item.endsAt, draft, endId, true);
                  const ready = item.startsAt && item.endsAt && item.endsAt > item.startsAt;
                  return (
                    <li key={item.key} className="border-t border-[rgba(36,56,79,0.10)] py-3 first:border-t-0">
                      <div className="grid items-start gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px_84px] md:gap-3">
                        <div className="min-w-0 md:pt-2">
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-[12.5px] text-[#5D6F83]">{itemDetail(item)}</p>
                        </div>
                        <AccessDateField id={`access-${item.key}-start`} label={t("sale.access.start")} compact value={item.startsAt} onChange={(iso, source) => writeItem(item.key, "startsAt", iso, source)} onBlur={() => onChange((current) => touchField(current, `${item.key}-start`))} />
                        <div>
                          <AccessDateField id={`access-${item.key}-end`} label={t("sale.access.end")} compact value={item.endsAt} onChange={(iso, source) => writeItem(item.key, "endsAt", iso, source)} onBlur={() => onChange((current) => touchField(current, endId))} invalid={Boolean(endMessage)} describedBy={endMessage ? `access-${item.key}-end-error` : undefined} />
                          {endMessage ? <p id={`access-${item.key}-end-error`} className="mt-1.5 text-[12.5px] text-[#9A3F3F]">{endMessage}</p> : null}
                        </div>
                        <p className="text-[12.5px] text-[#5D6F83] md:pt-3">{ready ? durationLabel(item.startsAt, item.endsAt, "short") : ""}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {note ? (
              <p className="mt-3.5 flex gap-2.5 rounded-md bg-[#F3F6F9] p-3 text-[13px] text-[#52657A]">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#2F5679]" aria-hidden="true" />
                <span>{note}</span>
              </p>
            ) : null}
          </>
        )}
      </div>
      ) : null}

      {!loading && !error ? (
        <div className="mt-7 border-t border-[rgba(36,56,79,0.10)] pt-6">
          <h2 className="mb-3 text-lg font-bold">{t("sale.services.title")}</h2>
          <ul>
            {SERVICES.map((service) => {
              const on = draft.services[service.key];
              return (
                <li key={service.key} className="flex min-h-[56px] items-center justify-between gap-3 border-t border-[rgba(36,56,79,0.10)] py-2 first:border-t-0">
                  <span className="font-semibold">{t(service.label)}</span>
                  <div role="radiogroup" aria-label={t(service.label)} className="flex rounded-md bg-[#EAEFF4] p-[3px]">
                    {([true, false] as const).map((value) => (
                      <button
                        key={String(value)}
                        type="button"
                        role="radio"
                        aria-checked={on === value}
                        onClick={() => onChange(setService(draft, service.key, value))}
                        className={cn(
                          "h-11 min-w-[64px] rounded px-3 text-[13px] font-semibold text-[#52657A]",
                          on === value && "bg-white text-[#24384F] shadow-[0_1px_2px_rgba(36,56,79,0.08)]",
                        )}
                      >
                        {t(value ? "common.yes" : "common.no")}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-7 flex items-center justify-between gap-3 max-md:hidden">
        <button type="button" onClick={onBack} className="inline-flex h-11 items-center rounded-md bg-white px-4 text-sm font-semibold text-[#2F5679] shadow-[inset_0_0_0_1px_rgba(36,56,79,0.16)]">Voltar</button>
        {reason ? <p id={reasonId} className={cn("flex-1 text-right text-[13px]", moving.tone === "error" ? "text-[#9A3F3F]" : "text-[#5D6F83]")}>{reason}</p> : <span className="flex-1" />}
        <button type="button" onClick={onNext} disabled={!canNext} aria-describedby={reason ? reasonId : undefined} className="inline-flex h-11 items-center rounded-md bg-[#2F5679] px-4 text-sm font-semibold text-white disabled:bg-[#C9D3DD] disabled:text-white disabled:opacity-100">Próximo</button>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 bg-white px-4 py-3 shadow-[0_-6px_20px_rgba(36,56,79,0.08)] md:hidden">
        <button type="button" onClick={onBack} className="inline-flex h-11 items-center text-sm font-semibold text-[#2F5679]">Voltar</button>
        <p className="min-w-0 flex-1 truncate text-[13px] text-[#5D6F83]">{items.length === 0 ? t("sale.preview.noCourses") : reason && !canNext ? reason : selectedLabel(items.length)}</p>
        <button type="button" onClick={onNext} disabled={!canNext} className="inline-flex h-11 items-center rounded-md bg-[#2F5679] px-4 text-sm font-semibold text-white disabled:bg-[#C9D3DD] disabled:text-white disabled:opacity-100">Próximo</button>
      </div>

      <AlertDialog open={confirmSame} onOpenChange={setConfirmSame}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sale.access.confirmSame")}</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">{t("sale.access.confirmSame")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => onChange(applyMode(draft, "same", catalog))}>{t("sale.access.confirmUse")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function ModuleRow({
  module,
  catalog,
  draft,
  query,
  onChange,
  onRowKey,
}: {
  module: CatalogModule;
  catalog: TeachingCatalog;
  draft: CourseDraft;
  query: string;
  onChange: Props["onChange"];
  onRowKey: (event: React.KeyboardEvent, toggle: () => void) => void;
}) {
  const on = draft.modules.includes(module.id);
  const names = (module.courseIds ?? []).map((id) => (catalog.courses ?? []).find((course) => course.id === id)?.name).filter((name): name is string => Boolean(name));
  const line = t(names.length === 1 ? "sale.courses.moduleCourses.one" : "sale.courses.moduleCourses.other", { n: names.length, nomes: names.join(", ") });
  const toggle = () => onChange(toggleModule(draft, module));
  return (
    <div
      role="checkbox"
      aria-checked={on}
      tabIndex={0}
      data-node={moduleKey(module.id)}
      onClick={toggle}
      onKeyDown={(event) => onRowKey(event, toggle)}
      className={ROW}
    >
      <Box on={on} />
      <Thumb src={module.thumbnailUrl} size="course" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold"><Highlight text={module.name} query={query} /></p>
        <p className="truncate text-[12.5px] text-[#5D6F83]" title={names.join(", ")}>{line}</p>
      </div>
      {on ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-[#2F5A43]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7FA88A]" aria-hidden="true" />
          {t("sale.courses.wholeModule")}
        </span>
      ) : null}
    </div>
  );
}

function CourseRow({
  course,
  catalog,
  draft,
  query,
  onChange,
  onRowKey,
}: {
  course: CatalogCourse;
  catalog: TeachingCatalog;
  draft: CourseDraft;
  query: string;
  onChange: Props["onChange"];
  onRowKey: (event: React.KeyboardEvent, toggle: () => void) => void;
}) {
  const locked = isCourseLocked(catalog, draft, course.id);
  const on = locked || draft.courses.includes(course.id);
  const note = includedLine(catalog, draft, course.id);
  const toggle = () => onChange(toggleCourse(draft, catalog, course));
  return (
    <div
      role="checkbox"
      aria-checked={on}
      aria-disabled={locked || undefined}
      tabIndex={locked ? -1 : 0}
      data-node={courseKey(course.id)}
      onClick={() => { if (!locked) toggle(); }}
      onKeyDown={(event) => { if (!locked) onRowKey(event, toggle); }}
      className={cn(ROW, locked && "cursor-default hover:bg-transparent")}
    >
      <Box on={on} locked={locked} />
      <Thumb src={course.thumbnailUrl} size="course" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold"><Highlight text={course.name} query={query} /></p>
        {note ? <p className="truncate text-[12.5px] text-[#5D6F83]">{note}</p> : null}
      </div>
    </div>
  );
}
