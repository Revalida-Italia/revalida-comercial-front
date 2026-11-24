import type { CreateSaleItem, SaleItem } from "@/services/commercialApi";
import type {
  CatalogCourse,
  CatalogModule,
  CourseDraft,
  CourseSaleItem,
  DateMode,
  ItemDates,
  SaleServices,
  TeachingCatalog,
} from "./types";

export type ListedItem = {
  key: string;
  kind: "course" | "module";
  courseId?: string;
  moduleId?: string;
  name: string;
  courseName: string;
  courseCount: number;
  courseNames: string[];
  startsAt: string;
  endsAt: string;
};

export type BlockReason = "empty" | "end" | "invalid";

export const emptyServices = (): SaleServices => ({
  translation: false,
  apostille: false,
  postal: false,
  decree: false,
});

export function courseKey(courseId: string): string {
  return `course:${courseId}`;
}

export function moduleKey(moduleId: string): string {
  return `module:${moduleId}`;
}

export function emptyDraft(saleDate: string): CourseDraft {
  return {
    saleDate,
    mode: "same",
    modules: [],
    courses: [],
    services: emptyServices(),
    sharedStart: saleDate,
    sharedEnd: "",
    perItem: {},
    labels: {},
    touched: {},
    editing: {},
    attempted: false,
  };
}

export function isCourseSaleItem(item: Pick<SaleItem, "kind" | "courseId" | "moduleId" | "productId">): boolean {
  return item.kind === "course" || item.kind === "module" || Boolean(item.courseId) || Boolean(item.moduleId);
}

/** A sale that still stores generic products, and none of the course items. */
export function isLegacySale(
  items: Array<Pick<SaleItem, "kind" | "courseId" | "moduleId" | "productId">> | undefined,
  accessMode?: string | null,
): boolean {
  if (accessMode === "courses") return false;
  if (accessMode === "legacy") return true;
  const list = items ?? [];
  return list.length > 0 && list.every((item) => Boolean(item.productId) && !isCourseSaleItem(item));
}

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
    if (!isCourseSaleItem(item)) continue;
    const kind: "course" | "module" = item.kind === "module" || (item.kind !== "course" && item.moduleId && !item.courseId)
      ? "module"
      : item.kind === "module"
        ? "module"
        : "course";
    if (kind === "module" && !item.moduleId) continue;
    if (kind === "course" && !item.courseId) continue;
    const courseName = item.courseName?.trim() || (kind === "course" ? item.name?.trim() : "") || "";
    const moduleName = kind === "module" ? (item.moduleName?.trim() || item.name?.trim() || "") : null;
    const name = kind === "module" ? moduleName || "" : courseName;
    if (!name) continue;
    const courseIds = Array.isArray(item.courseIds)
      ? item.courseIds.map((id) => id.trim()).filter(Boolean)
      : undefined;
    out.push({
      kind,
      ...(item.courseId ? { courseId: item.courseId } : {}),
      ...(kind === "module" && item.moduleId ? { moduleId: item.moduleId } : {}),
      ...(courseIds ? { courseIds } : {}),
      startsAt: (item.startsAt ?? "").slice(0, 10),
      endsAt: (item.endsAt ?? "").slice(0, 10),
      name,
      courseName: courseName || name,
      moduleName,
    });
  }
  return out;
}

export function draftFromItems(items: CourseSaleItem[], saleDate: string): CourseDraft {
  const draft = emptyDraft(saleDate || items[0]?.startsAt || "");
  const modules: string[] = [];
  const courses: string[] = [];
  const perItem: CourseDraft["perItem"] = {};
  const labels: CourseDraft["labels"] = {};

  for (const item of items) {
    if (item.kind === "module" && item.moduleId) {
      if (!modules.includes(item.moduleId)) modules.push(item.moduleId);
      const key = moduleKey(item.moduleId);
      perItem[key] = { startsAt: item.startsAt, endsAt: item.endsAt };
      labels[key] = {
        name: item.name,
        ...(item.courseIds ? { courseIds: item.courseIds } : {}),
      };
    } else if (item.courseId) {
      if (!courses.includes(item.courseId)) courses.push(item.courseId);
      const key = courseKey(item.courseId);
      perItem[key] = { startsAt: item.startsAt, endsAt: item.endsAt };
      labels[key] = { name: item.name, courseName: item.courseName };
    }
  }

  const dates = Object.values(perItem);
  const shared = dates.length > 0 && dates.every((row) => row.startsAt === dates[0].startsAt && row.endsAt === dates[0].endsAt);
  return {
    ...draft,
    modules,
    courses,
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

/** A missing catalog, or a bare array, is an empty catalog. Never read `.modules` off it. */
export function asCatalog(catalog: unknown): TeachingCatalog {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    return { modules: [], courses: [] };
  }
  const record = catalog as Partial<TeachingCatalog>;
  return {
    modules: Array.isArray(record.modules) ? record.modules : [],
    courses: Array.isArray(record.courses) ? record.courses : [],
  };
}

type ServiceFlagSource = {
  translationIncluded?: boolean | null;
  apostilleIncluded?: boolean | null;
  postalExpensesIncluded?: boolean | null;
  decreeIncluded?: boolean | null;
  services?: {
    translationIncluded?: boolean | null;
    apostilleIncluded?: boolean | null;
    postalExpensesIncluded?: boolean | null;
    decreeIncluded?: boolean | null;
  } | null;
};

/** Saved sale flags, whether the API returns them nested or on the sale itself. */
export function servicesFromRecord(sale: ServiceFlagSource): SaleServices {
  const nested = sale.services ?? {};
  const on = (key: keyof NonNullable<ServiceFlagSource["services"]>) => nested[key] === true || sale[key] === true;
  return {
    translation: on("translationIncluded"),
    apostille: on("apostilleIncluded"),
    postal: on("postalExpensesIncluded"),
    decree: on("decreeIncluded"),
  };
}

export function moduleById(catalog: TeachingCatalog, moduleId: string): CatalogModule | undefined {
  return asCatalog(catalog).modules.find((item) => item.id === moduleId);
}

export function courseById(catalog: TeachingCatalog, courseId: string): CatalogCourse | undefined {
  return asCatalog(catalog).courses.find((item) => item.id === courseId);
}

export function courseNamesOf(catalog: TeachingCatalog, module: CatalogModule): string[] {
  return (module.courseIds ?? [])
    .map((id) => courseById(catalog, id)?.name)
    .filter((name): name is string => Boolean(name));
}

function moduleRecord(catalog: TeachingCatalog, moduleId: string, savedName?: string): CatalogModule | undefined {
  const found = moduleById(catalog, moduleId);
  if (found) return found;
  const name = savedName?.trim().toLowerCase();
  if (!name) return undefined;
  return asCatalog(catalog).modules.find((item) => item.name.trim().toLowerCase() === name);
}

/** Modules currently selected that contain this course, in catalog order. */
export function lockingModules(catalog: TeachingCatalog, draft: CourseDraft, courseId: string): CatalogModule[] {
  return asCatalog(catalog).modules.filter((item) => draft.modules.includes(item.id) && (item.courseIds ?? []).includes(courseId));
}

export function isCourseLocked(catalog: TeachingCatalog, draft: CourseDraft, courseId: string): boolean {
  return lockingModules(catalog, draft, courseId).length > 0;
}

function withNewRow(draft: CourseDraft, key: string): CourseDraft {
  if (draft.mode === "same" || draft.perItem[key]) return draft;
  return {
    ...draft,
    perItem: { ...draft.perItem, [key]: { startsAt: draft.saleDate, endsAt: "" } },
  };
}

export function toggleModule(draft: CourseDraft, module: CatalogModule): CourseDraft {
  if (draft.modules.includes(module.id)) {
    return { ...draft, modules: draft.modules.filter((id) => id !== module.id) };
  }
  const covered = new Set(module.courseIds ?? []);
  return withNewRow({
    ...draft,
    modules: [...draft.modules, module.id],
    courses: draft.courses.filter((id) => !covered.has(id)),
  }, moduleKey(module.id));
}

export function toggleCourse(draft: CourseDraft, catalog: TeachingCatalog, course: CatalogCourse): CourseDraft {
  if (isCourseLocked(catalog, draft, course.id)) return draft;
  if (draft.courses.includes(course.id)) {
    return { ...draft, courses: draft.courses.filter((id) => id !== course.id) };
  }
  return withNewRow({ ...draft, courses: [...draft.courses, course.id] }, courseKey(course.id));
}

export function setService(draft: CourseDraft, key: keyof SaleServices, value: boolean): CourseDraft {
  return { ...draft, services: { ...draft.services, [key]: value } };
}

export function listItems(draft: CourseDraft, catalog: TeachingCatalog): ListedItem[] {
  const rows: ListedItem[] = [];
  const seenModules = new Set<string>();

  const pushModule = (moduleId: string, name: string, courseNames: string[], courseCount = courseNames.length) => {
    const key = moduleKey(moduleId);
    seenModules.add(moduleId);
    rows.push({
      key,
      kind: "module",
      moduleId,
      name,
      courseName: name,
      courseCount,
      courseNames,
      ...datesFor(draft, key),
    });
  };

  const pushCourse = (courseId: string, name: string) => {
    const key = courseKey(courseId);
    rows.push({
      key,
      kind: "course",
      courseId,
      name,
      courseName: name,
      courseCount: 0,
      courseNames: [],
      ...datesFor(draft, key),
    });
  };

  for (const moduleId of draft.modules) {
    const saved = draft.labels[moduleKey(moduleId)];
    const mod = moduleRecord(catalog, moduleId, saved?.name);
    if (!mod && !saved) continue;
    const savedIds = saved?.courseIds;
    const ids = Array.isArray(savedIds) ? savedIds : (mod?.courseIds ?? []);
    const names = ids
      .map((id) => courseById(catalog, id)?.name)
      .filter((name): name is string => Boolean(name));
    pushModule(moduleId, mod?.name || saved?.name || "", names, ids.length);
  }
  for (const courseId of draft.courses) {
    if (isCourseLocked(catalog, draft, courseId)) continue;
    const course = courseById(catalog, courseId);
    const saved = draft.labels[courseKey(courseId)];
    const name = course?.name || saved?.name || "";
    if (!name) continue;
    pushCourse(courseId, name);
  }
  return rows;
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

export function datesDiverge(draft: CourseDraft, catalog: TeachingCatalog): boolean {
  if (draft.mode !== "item") return false;
  const rows = listItems(draft, catalog);
  if (rows.length <= 1) return false;
  return rows.some((row) => row.startsAt !== rows[0].startsAt || row.endsAt !== rows[0].endsAt);
}

export function applyMode(draft: CourseDraft, mode: DateMode, catalog: TeachingCatalog): CourseDraft {
  if (mode === draft.mode) return draft;
  if (mode === "item") {
    const rows = listItems(draft, catalog);
    const perItem = { ...draft.perItem };
    for (const row of rows) perItem[row.key] = { startsAt: draft.sharedStart, endsAt: draft.sharedEnd };
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

export function copyFirstDates(draft: CourseDraft, catalog: TeachingCatalog): CourseDraft {
  const rows = listItems(draft, catalog);
  if (rows.length === 0) return draft;
  const first = { startsAt: rows[0].startsAt, endsAt: rows[0].endsAt };
  const perItem = { ...draft.perItem };
  for (const row of rows) perItem[row.key] = { ...first };
  return { ...draft, perItem };
}

/** Body of POST/PATCH /sales. Names are not sent. A covered course is not its own item. */
export function toCourseSaleItems(draft: CourseDraft, catalog: TeachingCatalog): CreateSaleItem[] {
  return listItems(draft, catalog).map((row) => {
    if (row.kind === "module" && row.moduleId) {
      return {
        kind: "module" as const,
        moduleId: row.moduleId,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
      };
    }
    return {
      kind: "course" as const,
      courseId: row.courseId ?? "",
      startsAt: row.startsAt,
      endsAt: row.endsAt,
    };
  });
}

export function blockReason(draft: CourseDraft, catalog: TeachingCatalog): BlockReason | null {
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

export function continueState(draft: CourseDraft, catalog: TeachingCatalog): {
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
  if (checked.some((row) => row.visible)) return { ok: false, tone: "error", message: "invalid" };
  if (checked.some((row) => row.missing)) return { ok: false, tone: "neutral", message: "end" };
  if (checked.some((row) => row.bad)) return { ok: false, tone: "neutral", message: null };
  return { ok: true, tone: "neutral", message: null };
}

export type CatalogView = {
  modules: CatalogModule[];
  courses: CatalogCourse[];
};

function uniqueIds(ids: readonly string[] | undefined): string[] {
  const out: string[] = [];
  for (const id of ids ?? []) {
    const trimmed = id.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

/**
 * Modules the sale may offer. Hidden modules stay out, and the same module
 * (same id, or the same name, such as a duplicated PRI) is listed once.
 * Courses stay inside the module; they are not returned as their own rows.
 */
export function commercialModules(catalog: TeachingCatalog): CatalogModule[] {
  const order: string[] = [];
  const byKey = new Map<string, CatalogModule>();
  const nameToKey = new Map<string, string>();

  for (const raw of asCatalog(catalog).modules) {
    if (raw.visibleInCommercial !== true) continue;
    const id = raw.id.trim();
    const name = raw.name.trim();
    if (!id || !name) continue;
    const nameKey = name.toLocaleLowerCase("pt-BR");
    const key = byKey.has(id) ? id : (nameToKey.get(nameKey) ?? id);
    const courseIds = uniqueIds(raw.courseIds);
    const current = byKey.get(key);
    if (current) {
      byKey.set(key, {
        ...current,
        thumbnailUrl: current.thumbnailUrl ?? raw.thumbnailUrl ?? null,
        courseIds: uniqueIds([...current.courseIds, ...courseIds]),
      });
      continue;
    }
    order.push(key);
    nameToKey.set(nameKey, key);
    byKey.set(key, {
      id,
      name,
      thumbnailUrl: raw.thumbnailUrl ?? null,
      courseIds,
      visibleInCommercial: true,
    });
  }

  return order.map((key) => byKey.get(key)!);
}

/** Local filter over visible modules. A search also hits the courses inside a module. */
export function filterCatalog(catalog: TeachingCatalog, query: string): CatalogView {
  const modulesAll = commercialModules(catalog);
  const q = query.trim().toLowerCase();
  if (!q) return { modules: modulesAll, courses: [] };
  const modules = modulesAll.filter((mod) => {
    if (mod.name.toLowerCase().includes(q)) return true;
    return (mod.courseIds ?? []).some((id) => courseById(catalog, id)?.name.toLowerCase().includes(q));
  });
  return { modules, courses: [] };
}
