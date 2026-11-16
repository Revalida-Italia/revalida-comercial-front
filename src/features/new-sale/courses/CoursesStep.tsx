import { useRef, useState } from "react";
import { AlertCircle, Check, ChevronRight, Copy, RefreshCw, Search, Users } from "lucide-react";
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
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { AccessDateField } from "./AccessDateField";
import { Thumb } from "./Thumb";
import {
  durationLabel,
  itemDetail,
  modulesLabel,
  rangeLabel,
  selectedLabel,
} from "./copy";
import {
  applyMode,
  continueState,
  copyFirstDates,
  courseKey,
  courseState,
  datesDiverge,
  fieldIssue,
  filterCatalog,
  listItems,
  moduleKey,
  setItemDate,
  setSharedDate,
  showFieldIssue,
  toggleCourse,
  toggleModule,
  touchField,
  setEditing,
} from "./model";
import type { CatalogCourse, CourseDraft } from "./types";

type Props = {
  catalog: CatalogCourse[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  draft: CourseDraft;
  onChange: (next: CourseDraft | ((current: CourseDraft) => CourseDraft)) => void;
  clients: string[];
  onBack: () => void;
  onNext: () => void;
};

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

function Box({ state }: { state: "all" | "partial" | "none" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[4px] bg-white shadow-[inset_0_0_0_1.5px_#9AA7B5]",
        state !== "none" && "bg-[#2F5679] text-white shadow-none",
      )}
    >
      {state === "all" ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      {state === "partial" ? <span className="block h-0.5 w-2 rounded-full bg-white" /> : null}
    </span>
  );
}

function dateIssue(start: string, end: string, draft: CourseDraft, field: string, short: boolean): string | null {
  const issue = fieldIssue(start, end, showFieldIssue(draft, field));
  if (issue === "required") return t("sale.access.errRequired");
  if (issue === "order") return t(short ? "sale.access.errEndShort" : "sale.access.errEnd");
  return null;
}

export function CoursesStep({ catalog, loading, error, onRetry, draft, onChange, clients, onBack, onNext }: Props) {
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [confirmSame, setConfirmSame] = useState(false);
  const treeRef = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLDivElement>());

  const matches = filterCatalog(catalog, query);
  const items = listItems(draft, catalog);
  const moving = continueState(draft, catalog);
  const searching = query.trim().length > 0;

  const expanded = (courseId: string, forced: boolean) => {
    if (searching) {
      if (openIds[courseId] === false) return false;
      return forced;
    }
    return Boolean(openIds[courseId]);
  };

  const setOpen = (courseId: string, value: boolean) => setOpenIds((prev) => ({ ...prev, [courseId]: value }));

  type Node = { key: string; course: CatalogCourse; moduleId?: string };
  const visible = (): Node[] => {
    const list: Node[] = [];
    for (const match of matches) {
      list.push({ key: courseKey(match.course.id), course: match.course });
      if (expanded(match.course.id, match.open)) {
        for (const mod of match.modules) list.push({ key: moduleKey(match.course.id, mod.id), course: match.course, moduleId: mod.id });
      }
    }
    return list;
  };

  const focusNode = (key: string) => {
    setActiveKey(key);
    nodes.current.get(key)?.focus();
  };

  const onTreeKey = (event: React.KeyboardEvent, node: Node) => {
    const list = visible();
    const index = list.findIndex((item) => item.key === node.key);
    if (event.key === "ArrowDown" && list[index + 1]) {
      event.preventDefault();
      focusNode(list[index + 1].key);
    } else if (event.key === "ArrowUp" && list[index - 1]) {
      event.preventDefault();
      focusNode(list[index - 1].key);
    } else if (event.key === "ArrowRight" && !node.moduleId) {
      event.preventDefault();
      const match = matches.find((item) => item.course.id === node.course.id);
      const isOpen = expanded(node.course.id, Boolean(match?.open));
      if (!isOpen) setOpen(node.course.id, true);
      else if (list[index + 1]?.moduleId) focusNode(list[index + 1].key);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (!node.moduleId && expanded(node.course.id, searching)) setOpen(node.course.id, false);
      else if (node.moduleId) focusNode(courseKey(node.course.id));
    } else if (event.key === " ") {
      event.preventDefault();
      if (node.moduleId) onChange(toggleModule(draft, node.course, node.moduleId));
      else onChange(toggleCourse(draft, node.course));
    }
  };

  const chooseMode = (mode: "same" | "item") => {
    if (mode === draft.mode) return;
    if (mode === "same" && datesDiverge(draft, catalog)) {
      setConfirmSame(true);
      return;
    }
    onChange(applyMode(draft, mode, catalog));
  };

  const writeShared = (field: "startsAt" | "endsAt", iso: string, source: "type" | "commit") => {
    const id = field === "endsAt" ? "shared-end" : "shared-start";
    onChange((current) => {
      const next = setSharedDate(current, field, iso);
      return source === "commit" ? touchField(next, id) : setEditing(next, id, true);
    });
  };

  const writeItem = (key: string, field: "startsAt" | "endsAt", iso: string, source: "type" | "commit") => {
    const id = `${key}-${field === "endsAt" ? "end" : "start"}`;
    onChange((current) => {
      const next = setItemDate(current, key, field, iso);
      return source === "commit" ? touchField(next, id) : setEditing(next, id, true);
    });
  };

  const reason = loading || error || items.length === 0
    ? t("sale.access.emptyTitle")
    : moving.message === "invalid"
      ? t("sale.access.fixToContinue")
      : moving.message === "end"
        ? t("sale.access.endRequired")
        : null;
  const canNext = !loading && !error && moving.ok;
  const reasonId = "course-next-reason";

  const clientNames = clients.map((name) => name.trim()).filter(Boolean);
  const named = (names: string[]) => {
    const and = t("sale.access.and");
    if (names.length === 2) return `${names[0]} ${and} ${names[1]}`;
    return `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}`;
  };
  const note = clientNames.length > 1 ? t("sale.access.clients", { n: clientNames.length, nomes: named(clientNames) }) : null;

  const periodLabel = items.length === 0
    ? ""
    : moving.tone === "error"
      ? ""
      : draft.mode === "same" && items[0].endsAt && items[0].endsAt > items[0].startsAt
        ? durationLabel(items[0].startsAt, items[0].endsAt, "access")
        : "";

  return (
    <section className="rounded-md bg-white p-6 text-[#24384F] shadow-[0_1px_2px_rgba(36,56,79,0.05),0_6px_20px_rgba(36,56,79,0.06)] max-md:rounded-none max-md:px-4 max-md:pb-4 max-md:shadow-none">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">{t("sale.courses.title")}</h2>
        {items.length > 0 ? <span className="whitespace-nowrap text-[13px] text-[#5D6F83]">{selectedLabel(items.length)}</span> : null}
      </div>

      <div className="mb-2 flex h-10 items-center gap-2 rounded-md bg-[#F3F6F9] px-3 text-[#5D6F83]">
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <label htmlFor="course-search" className="sr-only">{t("sale.courses.search")}</label>
        <input
          id="course-search"
          value={query}
          placeholder={t("sale.courses.search")}
          onChange={(event) => setQuery(event.target.value)}
          className="h-full w-full bg-transparent text-sm text-[#24384F] outline-none placeholder:text-[#5D6F83]"
          autoComplete="off"
        />
      </div>

      {loading ? (
        <div role="status" aria-busy="true" className="py-1">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex min-h-[52px] items-center gap-3">
              <span className="h-[18px] w-[18px] rounded bg-[#EAEFF4]" />
              <span className="h-9 w-14 rounded-[0.375rem] bg-[#EAEFF4]" />
              <span className="flex-1 space-y-2">
                <span className="block h-3 w-1/2 rounded bg-[#EAEFF4]" />
                <span className="block h-2.5 w-1/4 rounded bg-[#EAEFF4]" />
              </span>
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
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-[#2F5679] shadow-[inset_0_0_0_1px_rgba(36,56,79,0.16)]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t("sale.courses.retry")}
          </button>
        </div>
      ) : null}

      {!loading && !error && searching && matches.length === 0 ? (
        <div className="px-3 py-7 text-center text-[#5D6F83]">
          <Search className="mx-auto mb-2 h-7 w-7 text-[#7C8A9A]" aria-hidden="true" />
          <p className="font-semibold text-[#24384F]">{t("sale.courses.noResults", { q: query.trim() })}</p>
          <p>{t("sale.courses.noResultsHint")}</p>
        </div>
      ) : null}

      {!loading && !error && matches.length > 0 ? (
        <div ref={treeRef} role="tree" aria-label={t("sale.courses.title")}>
          {matches.map((match) => {
            const state = courseState(match.course, draft.selection[match.course.id]);
            const isOpen = expanded(match.course.id, match.open);
            const key = courseKey(match.course.id);
            const checked = state === "all" ? "true" : state === "partial" ? "mixed" : "false";
            return (
              <div key={match.course.id} className="border-b border-[rgba(36,56,79,0.10)] last:border-b-0">
                <div
                  role="treeitem"
                  aria-level={1}
                  aria-expanded={isOpen}
                  aria-checked={checked}
                  aria-selected={activeKey === key}
                  tabIndex={activeKey === key || (!activeKey && match === matches[0]) ? 0 : -1}
                  data-node={key}
                  ref={(el) => { if (el) nodes.current.set(key, el); else nodes.current.delete(key); }}
                  onFocus={() => setActiveKey(key)}
                  onKeyDown={(event) => onTreeKey(event, { key, course: match.course })}
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest("[data-row-ignore]")) return;
                    onChange(toggleCourse(draft, match.course));
                  }}
                  className="flex min-h-[52px] cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-1 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F5679]"
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    data-row-ignore=""
                    className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center text-[#5D6F83]"
                    aria-label={t("sale.courses.toggle", { curso: match.course.name })}
                    aria-expanded={isOpen}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpen(match.course.id, !isOpen);
                    }}
                  >
                    <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
                  </button>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    aria-label={match.course.name}
                    tabIndex={-1}
                    data-row-ignore=""
                    onClick={(event) => {
                      event.stopPropagation();
                      onChange(toggleCourse(draft, match.course));
                    }}
                    className="grid h-11 w-11 shrink-0 place-items-center"
                  >
                    <Box state={state} />
                  </button>
                  <Thumb src={match.course.thumbnailUrl} size="course" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold"><Highlight text={match.course.name} query={query} /></p>
                    <p className="text-[12.5px] text-[#5D6F83]">{modulesLabel(match.course.modules.length)}</p>
                  </div>
                  {state === "all" ? (
                    <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-[#2F5A43]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7FA88A]" aria-hidden="true" />
                      {t("sale.courses.wholeCourse")}
                    </span>
                  ) : null}
                  {state === "partial" ? (
                    <span className="shrink-0 text-[12.5px] text-[#5D6F83]">
                      {t("sale.courses.partial", {
                        x: (draft.selection[match.course.id] === "all" ? match.course.modules.length : (draft.selection[match.course.id] as string[] | undefined)?.length ?? 0),
                        n: match.course.modules.length,
                      })}
                    </span>
                  ) : null}
                </div>
                {isOpen ? (
                  <div role="group" className="pb-2.5 pl-11">
                    {match.modules.map((mod) => {
                      const on = state === "all" || (draft.selection[match.course.id] !== "all" && (draft.selection[match.course.id] as string[] | undefined)?.includes(mod.id));
                      const modNode = moduleKey(match.course.id, mod.id);
                      return (
                        <div
                          key={mod.id}
                          role="treeitem"
                          aria-level={2}
                          aria-checked={on ? "true" : "false"}
                          aria-selected={activeKey === modNode}
                          tabIndex={activeKey === modNode ? 0 : -1}
                          data-node={modNode}
                          ref={(el) => { if (el) nodes.current.set(modNode, el); else nodes.current.delete(modNode); }}
                          onFocus={() => setActiveKey(modNode)}
                          onKeyDown={(event) => onTreeKey(event, { key: modNode, course: match.course, moduleId: mod.id })}
                          onClick={(event) => {
                            if ((event.target as HTMLElement).closest("[data-row-ignore]")) return;
                            onChange(toggleModule(draft, match.course, mod.id));
                          }}
                          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm py-1 pr-1 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F5679]"
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            aria-label={mod.name}
                            tabIndex={-1}
                            data-row-ignore=""
                            onClick={(event) => {
                              event.stopPropagation();
                              onChange(toggleModule(draft, match.course, mod.id));
                            }}
                            className="grid h-11 w-11 shrink-0 place-items-center"
                          >
                            <Box state={on ? "all" : "none"} />
                          </button>
                          <Thumb src={mod.thumbnailUrl} size="module" />
                          <p className="min-w-0 flex-1 truncate"><Highlight text={mod.name} query={query} /></p>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-7 border-t border-[rgba(36,56,79,0.10)] pt-6">
        <div className="mb-3.5 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">{t("sale.access.title")}</h2>
          {items.length > 0 ? <span className="text-[13px] text-[#5D6F83]">{selectedLabel(items.length)}</span> : null}
        </div>

        {items.length === 0 ? (
          <div className="rounded-md bg-[#F3F6F9] px-3 py-4 text-center text-[#5D6F83]">
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
                  <p className="pb-2 text-[13px] text-[#5D6F83] md:pb-2.5">
                    {periodLabel ? <span className="font-semibold text-[#24384F]">{periodLabel}</span> : null}
                  </p>
                </div>
                <p className="mt-3.5 text-[13px] text-[#52657A]">
                  {t("sale.access.appliesTo")}{" "}
                  {items.reduce<string[]>((names, item) => (names.includes(item.courseName) ? names : [...names, item.courseName]), []).map((name, index, all) => {
                    const course = catalog.find((item) => item.name === name);
                    const selection = course ? draft.selection[course.id] : undefined;
                    const detail = selection === "all" || !course
                      ? t("sale.courses.wholeCourse")
                      : t("sale.courses.partial", { x: selection?.length ?? 0, n: course.modules.length });
                    return (
                      <span key={name}>
                        {index > 0 ? " · " : null}
                        <span className="font-semibold text-[#24384F]">{name}</span>
                        {` (${detail})`}
                        {index === all.length - 1 ? "" : ""}
                      </span>
                    );
                  })}
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[13px] text-[#5D6F83]">{t("sale.access.perItemHint")}</span>
                  <button
                    type="button"
                    onClick={() => onChange(copyFirstDates(draft, catalog))}
                    className="inline-flex h-11 items-center gap-2 px-2 text-[13px] font-semibold text-[#2F5679]"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    {t("sale.access.copyFirst")}
                  </button>
                </div>
                <div className="hidden grid-cols-[minmax(0,1fr)_150px_150px_84px] gap-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5D6F83] md:grid">
                  <span>{t("sale.summary.item")}</span>
                  <span>{t("sale.access.start")}</span>
                  <span>{t("sale.access.end")}</span>
                  <span>{t("sale.access.duration")}</span>
                </div>
                <ul>
                  {items.map((item, index) => {
                    const previous = items[index - 1];
                    const showGroup = item.kind === "module" && item.courseName !== previous?.courseName;
                    const startId = `${item.key}-start`;
                    const endId = `${item.key}-end`;
                    const endMessage = dateIssue(item.startsAt, item.endsAt, draft, endId, true);
                    const ready = item.startsAt && item.endsAt && item.endsAt > item.startsAt;
                    return (
                      <li key={item.key} className="border-t border-[rgba(36,56,79,0.10)] py-3 first:border-t-0">
                        {showGroup ? <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5D6F83]">{item.courseName}</p> : null}
                        <div className="grid items-start gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px_84px] md:gap-3">
                          <div className="min-w-0 md:pt-2">
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-[12.5px] text-[#5D6F83]">{itemDetail(item)}</p>
                          </div>
                          <AccessDateField
                            id={`access-${item.key}-start`}
                            label={t("sale.access.start")}
                            compact
                            value={item.startsAt}
                            onChange={(iso, source) => writeItem(item.key, "startsAt", iso, source)}
                            onBlur={() => onChange((current) => touchField(current, startId))}
                          />
                          <div>
                            <AccessDateField
                              id={`access-${item.key}-end`}
                              label={t("sale.access.end")}
                              compact
                              value={item.endsAt}
                              onChange={(iso, source) => writeItem(item.key, "endsAt", iso, source)}
                              onBlur={() => onChange((current) => touchField(current, endId))}
                              invalid={Boolean(endMessage)}
                              describedBy={endMessage ? `access-${item.key}-end-error` : undefined}
                            />
                            {endMessage ? (
                              <p id={`access-${item.key}-end-error`} className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[#9A3F3F]">
                                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                {endMessage}
                              </p>
                            ) : null}
                          </div>
                          <p className="text-[12.5px] text-[#5D6F83] md:pt-3">{ready ? durationLabel(item.startsAt, item.endsAt, "short") : ""}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
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

      <div className="mt-7 flex items-center justify-between gap-3 max-md:hidden">
        <button type="button" onClick={onBack} className="inline-flex h-11 items-center rounded-md bg-white px-4 text-sm font-semibold text-[#2F5679] shadow-[inset_0_0_0_1px_rgba(36,56,79,0.16)]">
          Voltar
        </button>
        {reason ? (
          <p id={reasonId} className={cn("flex-1 text-right text-[13px]", moving.tone === "error" ? "text-[#9A3F3F]" : "text-[#5D6F83]")}>
            {reason}
          </p>
        ) : <span className="flex-1" />}
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          aria-describedby={reason ? reasonId : undefined}
          className="inline-flex h-11 items-center rounded-md bg-[#2F5679] px-4 text-sm font-semibold text-white disabled:bg-[#C9D3DD]"
        >
          Próximo
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 bg-white px-4 py-3 shadow-[0_-6px_20px_rgba(36,56,79,0.08)] md:hidden">
        <button type="button" onClick={onBack} className="inline-flex h-11 items-center text-sm font-semibold text-[#2F5679]">
          Voltar
        </button>
        <div className={cn("min-w-0 flex-1 text-[13px] leading-tight text-[#5D6F83]", moving.tone === "error" && "text-[#9A3F3F]")}>
          <p className={cn("font-semibold text-[#24384F]", !(reason && !canNext) && "truncate")}>{items.length === 0 ? t("sale.preview.noCourses") : reason && !canNext ? reason : selectedLabel(items.length)}</p>
          {canNext ? (
            <p className="truncate">
              {draft.mode === "item" || !items[0] || !(items[0].endsAt > items[0].startsAt)
                ? t("sale.access.perItemHint")
                : rangeLabel(items[0].startsAt, items[0].endsAt)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="inline-flex h-11 items-center rounded-md bg-[#2F5679] px-4 text-sm font-semibold text-white disabled:bg-[#C9D3DD]"
        >
          Próximo
        </button>
      </div>

      <AlertDialog open={confirmSame} onOpenChange={setConfirmSame}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sale.access.confirmSame")}</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">{t("sale.access.confirmSame")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => onChange(applyMode(draft, "same", catalog))}>
              {t("sale.access.confirmUse")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
