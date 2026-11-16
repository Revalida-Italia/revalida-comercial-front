import type { SaleItem } from "@/services/commercialApi";
import type { CreateSaleItem } from "@/services/commercialApi";
import type {
  CatalogCourse,
  CourseDraft,
  CourseSaleItem,
  CourseSelection,
  DateMode,
  ItemDates,
} from "./types";

export type ListedItem = {
  key: string;
  kind: "course" | "module";
  courseId: string;
  moduleId?: string;
  name: string;
  courseName: string;
  moduleCount: number;
  startsAt: string;
  endsAt: string;
};

export type BlockReason = "empty" | "end" | "invalid";

export function courseKey(courseId: string): string {
  return `course:${courseId}`;
}

export function moduleKey(courseId: string, moduleId: string): string {
  return `module:${courseId}:${moduleId}`;
}

export function emptyDraft(saleDate: string): CourseDraft {
  return {
    saleDate,
    mode: "same",
    selection: {},
    sharedStart: saleDate,
    sharedEnd: "",
    perItem: {},
    labels: {},
    touched: {},
    editing: {},
    attempted: false,
  };
}

export function isCourseSaleItem(item: Pick<SaleItem, "kind" | "courseId" | "productId">): boolean {
  return item.kind === "course" || item.kind === "module" || Boolean(item.courseId);
}

/** A sale that still stores generic products, and none of the course items. */
export function isLegacySale(
  items: Array<Pick<SaleItem, "kind" | "courseId" | "productId">> | undefined,
  accessMode?: string | null,
): boolean {
  if (accessMode === "courses") return false;
  if (accessMode === "legacy") return true;
  const list = items ?? [];
  return list.length > 0 && list.every((item) => Boolean(item.productId) && !isCourseSaleItem(item));
}

/** Display name of a saved line. The sale response freezes `courseName` and `moduleName`. */
export function frozenItemTitle(item: {
  kind?: string | null;
  courseName?: string | null;
  moduleName?: string | null;
  name?: string | null;
}): string {
  if (item.kind === "module") return item.moduleName?.trim() || item.name?.trim() || item.courseName?.trim() || "";
  return item.courseName?.trim() || item.name?.trim() || "";
}

export function readCourseItems(items: SaleItem[] | undefined): CourseSaleItem[] {
  const out: CourseSaleItem[] = [];
  for (const item of items ?? []) {
    if (!isCourseSaleItem(item) || !item.courseId) continue;
    const kind: "course" | "module" = item.kind === "module" || (item.kind !== "course" && item.moduleId) ? "module" : "course";
    const courseName = item.courseName?.trim() || (kind === "course" ? item.name?.trim() : "") || "";
    const moduleName = kind === "module" ? (item.moduleName?.trim() || item.name?.trim() || "") : null;
    const name = kind === "module" ? moduleName || "" : courseName;
    if (!name || !courseName || (kind === "module" && !item.moduleId)) continue;
    out.push({
      kind,
      courseId: item.courseId,
      ...(kind === "module" && item.moduleId ? { moduleId: item.moduleId } : {}),
      startsAt: (item.startsAt ?? "").slice(0, 10),
      endsAt: (item.endsAt ?? "").slice(0, 10),
      name,
      courseName,
      moduleName,
    });
  }
  return out;
}

export function draftFromItems(items: CourseSaleItem[], saleDate: string): CourseDraft {
  const draft = emptyDraft(saleDate || items[0]?.startsAt || "");
  const selection: CourseDraft["selection"] = {};
  const perItem: CourseDraft["perItem"] = {};
  const labels: CourseDraft["labels"] = {};

  for (const item of items) {
    const key = item.kind === "module" && item.moduleId
      ? moduleKey(item.courseId, item.moduleId)
      : courseKey(item.courseId);
    if (item.kind === "course") {
      selection[item.courseId] = "all";
    } else if (item.moduleId && selection[item.courseId] !== "all") {
      const current = selection[item.courseId];
      const ids = current && current !== "all" ? current : [];
      if (!ids.includes(item.moduleId)) selection[item.courseId] = [...ids, item.moduleId];
    }
    perItem[key] = { startsAt: item.startsAt, endsAt: item.endsAt };
    labels[key] = { name: item.name, courseName: item.courseName };
    labels[courseKey(item.courseId)] = { name: item.courseName, courseName: item.courseName };
  }

  const dates = Object.values(perItem);
  const shared = dates.length > 0 && dates.every((row) => row.startsAt === dates[0].startsAt && row.endsAt === dates[0].endsAt);
  return {
    ...draft,
    selection,
    perItem,
    labels,
    mode: shared || dates.length <= 1 ? "same" : "item",
    sharedStart: shared || dates.length <= 1 ? (dates[0]?.startsAt || saleDate) : saleDate,
    sharedEnd: shared || dates.length <= 1 ? (dates[0]?.endsAt || "") : "",
  };
}

function datesFor(draft: CourseDraft, key: string): ItemDates {
  if (draft.mode === "same") return { startsAt: draft.sharedStart, endsAt: draft.sharedEnd };
  return draft.perItem[key] ?? { startsAt: draft.saleDate, endsAt: "" };
}

function courseById(catalog: CatalogCourse[], courseId: string): CatalogCourse | undefined {
  return catalog.find((course) => course.id === courseId);
}

export function courseState(course: CatalogCourse, selection: CourseSelection | undefined): "all" | "partial" | "none" {
  if (!selection) return "none";
  if (selection === "all") return "all";
  if (selection.length === 0) return "none";
  if (course.modules.length > 0 && course.modules.every((mod) => selection.includes(mod.id))) return "all";
  return "partial";
}

export function listItems(draft: CourseDraft, catalog: CatalogCourse[]): ListedItem[] {
  const rows: ListedItem[] = [];
  const seen = new Set<string>();

  const pushCourse = (courseId: string, courseName: string, moduleCount: number) => {
    const key = courseKey(courseId);
    seen.add(courseId);
    const dates = datesFor(draft, key);
    rows.push({
      key,
      kind: "course",
      courseId,
      name: courseName,
      courseName,
      moduleCount,
      ...dates,
    });
  };

  const pushModule = (courseId: string, moduleId: string, name: string, courseName: string, moduleCount: number) => {
    const key = moduleKey(courseId, moduleId);
    const dates = datesFor(draft, key);
    rows.push({
      key,
      kind: "module",
      courseId,
      moduleId,
      name,
      courseName,
      moduleCount,
      ...dates,
    });
  };

  for (const course of catalog) {
    const selection = draft.selection[course.id];
    const state = courseState(course, selection);
    if (state === "none") continue;
    seen.add(course.id);
    if (state === "all") {
      pushCourse(course.id, course.name, course.modules.length);
      continue;
    }
    const ids = selection === "all" ? [] : selection ?? [];
    for (const moduleId of ids) {
      const mod = course.modules.find((item) => item.id === moduleId);
      const saved = draft.labels[moduleKey(course.id, moduleId)];
      if (!mod && !saved) continue;
      pushModule(course.id, moduleId, mod?.name || saved?.name || "", course.name, course.modules.length);
    }
  }

  for (const [courseId, selection] of Object.entries(draft.selection)) {
    if (seen.has(courseId)) continue;
    const savedCourse = draft.labels[courseKey(courseId)];
    const courseName = savedCourse?.name || savedCourse?.courseName || "";
    if (selection === "all") {
      if (courseName) pushCourse(courseId, courseName, 0);
      continue;
    }
    for (const moduleId of selection) {
      const saved = draft.labels[moduleKey(courseId, moduleId)];
      if (!saved) continue;
      pushModule(courseId, moduleId, saved.name, saved.courseName || courseName, 0);
    }
  }

  return rows;
}

function withNewRow(draft: CourseDraft, key: string): CourseDraft {
  if (draft.mode === "same" || draft.perItem[key]) return draft;
  return {
    ...draft,
    perItem: { ...draft.perItem, [key]: { startsAt: draft.saleDate, endsAt: "" } },
  };
}

export function toggleCourse(draft: CourseDraft, course: CatalogCourse): CourseDraft {
  const state = courseState(course, draft.selection[course.id]);
  const selection = { ...draft.selection };
  if (state === "all") {
    delete selection[course.id];
    return { ...draft, selection };
  }
  selection[course.id] = "all";
  return withNewRow({ ...draft, selection }, courseKey(course.id));
}

export function toggleModule(draft: CourseDraft, course: CatalogCourse, moduleId: string): CourseDraft {
  const current = draft.selection[course.id];
  let ids: string[];
  if (current === "all") ids = course.modules.map((mod) => mod.id);
  else ids = [...(current ?? [])];

  if (ids.includes(moduleId)) ids = ids.filter((id) => id !== moduleId);
  else ids = [...ids, moduleId];

  const selection = { ...draft.selection };
  if (ids.length === 0) delete selection[course.id];
  else if (course.modules.length > 0 && course.modules.every((mod) => ids.includes(mod.id))) selection[course.id] = "all";
  else selection[course.id] = ids;

  const next = { ...draft, selection };
  const key = selection[course.id] === "all" ? courseKey(course.id) : moduleKey(course.id, moduleId);
  if (!ids.includes(moduleId) && selection[course.id] !== "all") return next;
  return withNewRow(next, key);
}

export function touchField(draft: CourseDraft, field: string): CourseDraft {
  const editing = { ...draft.editing };
  delete editing[field];
  const touched = draft.touched[field] ? draft.touched : { ...draft.touched, [field]: true as const };
  return { ...draft, touched, editing };
}

export function setEditing(draft: CourseDraft, field: string, editing: boolean): CourseDraft {
  if (editing === Boolean(draft.editing[field])) return draft;
  const next = { ...draft.editing };
  if (editing) next[field] = true;
  else delete next[field];
  return { ...draft, editing: next };
}

export function markAttempted(draft: CourseDraft): CourseDraft {
  return { ...draft, attempted: true };
}

export function setSharedDate(draft: CourseDraft, field: "startsAt" | "endsAt", value: string): CourseDraft {
  return field === "startsAt" ? { ...draft, sharedStart: value } : { ...draft, sharedEnd: value };
}

export function setItemDate(draft: CourseDraft, key: string, field: keyof ItemDates, value: string): CourseDraft {
  const current = draft.perItem[key] ?? { startsAt: draft.saleDate, endsAt: "" };
  return { ...draft, perItem: { ...draft.perItem, [key]: { ...current, [field]: value } } };
}

export function datesDiverge(draft: CourseDraft, catalog: CatalogCourse[]): boolean {
  if (draft.mode !== "item") return false;
  const rows = listItems(draft, catalog);
  if (rows.length <= 1) return false;
  return rows.some((row) => row.startsAt !== rows[0].startsAt || row.endsAt !== rows[0].endsAt);
}

export function applyMode(draft: CourseDraft, mode: DateMode, catalog: CatalogCourse[]): CourseDraft {
  if (mode === draft.mode) return draft;
  if (mode === "item") {
    const rows = listItems(draft, catalog);
    const perItem = { ...draft.perItem };
    for (const row of rows) {
      perItem[row.key] = { startsAt: draft.sharedStart, endsAt: draft.sharedEnd };
    }
    return { ...draft, mode: "item", perItem };
  }
  const rows = listItems(draft, catalog);
  return {
    ...draft,
    mode: "same",
    sharedStart: rows[0]?.startsAt || draft.saleDate,
    sharedEnd: rows[0]?.endsAt ?? "",
  };
}

export function copyFirstDates(draft: CourseDraft, catalog: CatalogCourse[]): CourseDraft {
  const rows = listItems(draft, catalog);
  if (rows.length === 0) return draft;
  const first = { startsAt: rows[0].startsAt, endsAt: rows[0].endsAt };
  const perItem = { ...draft.perItem };
  for (const row of rows) perItem[row.key] = { ...first };
  return { ...draft, perItem };
}

/** Body of POST/PATCH /sales. The server freezes the names; they are not sent. */
export function toCourseSaleItems(draft: CourseDraft, catalog: CatalogCourse[]): CreateSaleItem[] {
  return listItems(draft, catalog).map((row) => ({
    kind: row.kind,
    courseId: row.courseId,
    ...(row.kind === "module" && row.moduleId ? { moduleId: row.moduleId } : {}),
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  }));
}

export function blockReason(draft: CourseDraft, catalog: CatalogCourse[]): BlockReason | null {
  const rows = listItems(draft, catalog);
  if (rows.length === 0) return "empty";
  const invalid = rows.some((row) => row.startsAt && row.endsAt && row.endsAt <= row.startsAt);
  if (invalid) return "invalid";
  const missing = rows.some((row) => !row.startsAt || !row.endsAt);
  if (missing) return "end";
  return null;
}

export type FieldIssue = "required" | "order" | null;

export function fieldIssue(start: string, end: string, visible: boolean): FieldIssue {
  if (!visible) return null;
  if (!end) return "required";
  if (start && end <= start) return "order";
  return null;
}

export function showFieldIssue(draft: CourseDraft, field: string): boolean {
  if (draft.editing[field]) return false;
  return draft.attempted || Boolean(draft.touched[field]);
}

export function continueState(draft: CourseDraft, catalog: CatalogCourse[]): {
  ok: boolean;
  tone: "neutral" | "error";
  message: string | null;
} {
  const rows = listItems(draft, catalog);
  if (rows.length === 0) return { ok: false, tone: "neutral", message: null };
  const checked = rows.map((row) => {
    const field = draft.mode === "same" ? "shared-end" : `${row.key}-end`;
    const bad = Boolean(row.startsAt && row.endsAt && row.endsAt <= row.startsAt);
    const missing = !row.startsAt || !row.endsAt;
    return { bad, missing, visible: bad && showFieldIssue(draft, field) };
  });
  if (checked.some((row) => row.visible)) {
    return { ok: false, tone: "error", message: "invalid" };
  }
  if (checked.some((row) => row.missing)) return { ok: false, tone: "neutral", message: "end" };
  if (checked.some((row) => row.bad)) return { ok: false, tone: "neutral", message: null };
  return { ok: true, tone: "neutral", message: null };
}

export type CatalogMatch = {
  course: CatalogCourse;
  modules: CatalogCourse["modules"];
  open: boolean;
};

/** Local filter. A course opens when one of its modules matches. */
export function filterCatalog(catalog: CatalogCourse[], query: string): CatalogMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return catalog.map((course) => ({ course, modules: course.modules, open: false }));
  const matches: CatalogMatch[] = [];
  for (const course of catalog) {
    const nameHit = course.name.toLowerCase().includes(q);
    const modules = course.modules.filter((mod) => mod.name.toLowerCase().includes(q));
    if (!nameHit && modules.length === 0) continue;
    const moduleHit = modules.length > 0;
    matches.push({
      course,
      modules: moduleHit ? modules : course.modules,
      open: moduleHit || nameHit,
    });
  }
  return matches;
}

export type PreviewGroup = {
  courseId: string;
  title: string;
  whole: boolean;
  modules: string[];
};

export function previewGroups(rows: ListedItem[]): PreviewGroup[] {
  const groups: PreviewGroup[] = [];
  for (const row of rows) {
    let group = groups.find((item) => item.courseId === row.courseId);
    if (!group) {
      group = { courseId: row.courseId, title: row.courseName, whole: false, modules: [] };
      groups.push(group);
    }
    if (row.kind === "course") group.whole = true;
    else group.modules.push(row.name);
  }
  return groups;
}
