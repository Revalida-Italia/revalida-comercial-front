import { t, type MessageKey } from "@/i18n";
import { accessLength } from "./duration";
import { formatAccessDate } from "./dates";
import { continueState, listItems, previewGroups, type ListedItem } from "./model";
import type { CatalogCourse, CourseDraft } from "./types";

function plural(group: string, n: number): string {
  return t(`${group}.${n === 1 ? "one" : "other"}` as MessageKey, { n });
}

export function modulesLabel(n: number): string {
  return plural("sale.courses.modulesCount", n);
}

export function selectedLabel(n: number): string {
  return plural("sale.courses.selected", n);
}

export function monthsAccessLabel(n: number): string {
  return plural("sale.access.months", n);
}

export function durationLabel(start: string, end: string, style: "access" | "short"): string {
  const length = accessLength(start, end);
  if (!length) return "";
  if (length.unit === "day") return plural("sale.access.durationDays", length.count);
  return style === "access"
    ? plural("sale.access.months", length.count)
    : plural("sale.access.durationMonths", length.count);
}

export function rangeLabel(start: string, end: string): string {
  return t("sale.access.range", { start: formatAccessDate(start), end: formatAccessDate(end) });
}

export function joinNames(names: string[]): string {
  const and = t("sale.access.and");
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} ${and} ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}`;
}

export function itemDetail(item: ListedItem): string {
  if (item.kind === "course") {
    return item.moduleCount > 0
      ? `${t("sale.courses.wholeCourse")} · ${modulesLabel(item.moduleCount)}`
      : t("sale.courses.wholeCourse");
  }
  return t("sale.courses.moduleOf", { curso: item.courseName });
}

export type CourseSummaryModel = {
  rows: Array<{ key: string; title: string; detail: string; period: string; duration: string }>;
  groups: Array<{ courseId: string; title: string; detail: string }>;
  period: string;
  tone: "muted" | "error";
  clientNote: string | null;
  summaryNote: string | null;
};

export function buildCourseSummary(draft: CourseDraft, catalog: CatalogCourse[], clientNames: string[]): CourseSummaryModel {
  const items = listItems(draft, catalog);
  const state = continueState(draft, catalog);
  const rows = items.map((item) => {
    const ready = item.startsAt && item.endsAt && item.endsAt > item.startsAt;
    return {
      key: item.key,
      title: item.name,
      detail: itemDetail(item),
      period: ready ? rangeLabel(item.startsAt, item.endsAt) : "",
      duration: ready ? durationLabel(item.startsAt, item.endsAt, "short") : "",
    };
  });
  const groups = previewGroups(items).map((group) => ({
    courseId: group.courseId,
    title: group.title,
    detail: group.whole ? t("sale.courses.wholeCourse") : group.modules.join(", "),
  }));

  let period = t("sale.preview.noCourses");
  let tone: "muted" | "error" = "muted";
  if (items.length > 0 && state.tone === "error") {
    period = t("sale.access.toFix");
    tone = "error";
  } else if (items.length > 0 && state.message === "end") {
    period = t("sale.access.endPending");
  } else if (items.length > 0 && draft.mode === "item" && state.ok) {
    period = t("sale.access.perItemHint");
  } else if (items.length > 0 && state.ok) {
    period = rangeLabel(items[0].startsAt, items[0].endsAt);
  } else if (items.length > 0) {
    period = rangeLabel(items[0].startsAt, items[0].endsAt);
  }

  const names = clientNames.map((name) => name.trim()).filter(Boolean);
  return {
    rows,
    groups,
    period,
    tone,
    clientNote: names.length > 1 ? t("sale.access.clients", { n: names.length, nomes: joinNames(names) }) : null,
    summaryNote: names.length > 1 ? t("sale.summary.sameForClients", { n: names.length }) : null,
  };
}
