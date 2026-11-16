import { apiRequest } from "@/lib/http";
import { MOCK_COURSE_CATALOG } from "./mockCatalog";
import type { CatalogCourse, CatalogModule, TeachingCatalog } from "./types";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

export function catalogUsesMock(): boolean {
  return import.meta.env.VITE_COURSE_CATALOG === "mock";
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function imageUrl(record: Record<string, unknown>): string | null {
  const value = record.thumbnailUrl ?? record.coverUrl ?? record.imageUrl ?? record.thumbnail;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function unwrap(payload: unknown): Record<string, unknown> | null {
  const record = asRecord(payload);
  if (!record) return null;
  const data = asRecord(record.data);
  return data ?? record;
}

function readCourse(raw: unknown): CatalogCourse | null {
  const record = asRecord(raw);
  if (!record) return null;
  const id = text(record.id ?? record.courseId);
  const name = text(record.name ?? record.title);
  if (!id || !name) return null;
  return { id, name, thumbnailUrl: imageUrl(record) };
}

function readGroupingModule(raw: unknown): CatalogModule | null {
  const record = asRecord(raw);
  if (!record) return null;
  const id = text(record.id ?? record.moduleId);
  const name = text(record.name ?? record.title);
  const courseIds = Array.isArray(record.courseIds)
    ? record.courseIds.map((item) => text(item)).filter(Boolean)
    : Array.isArray(record.courses)
      ? record.courses.map((item) => text(asRecord(item)?.id ?? item)).filter(Boolean)
      : [];
  if (!id || !name) return null;
  return { id, name, thumbnailUrl: imageUrl(record), courseIds };
}

/** Courses that list their modules become modules that list those courses. */
function invertNestedCourses(list: unknown[]): TeachingCatalog {
  const courses: CatalogCourse[] = [];
  const modules = new Map<string, CatalogModule>();
  for (const raw of list) {
    const record = asRecord(raw);
    const course = readCourse(raw);
    if (!record || !course) continue;
    courses.push(course);
    const nested = Array.isArray(record.modules) ? record.modules : [];
    for (const entry of nested) {
      const child = asRecord(entry);
      if (!child) continue;
      const id = text(child.id ?? child.moduleId);
      const name = text(child.name ?? child.title);
      if (!id || !name) continue;
      const current = modules.get(id) ?? { id, name, thumbnailUrl: imageUrl(child), courseIds: [] };
      if (!current.courseIds.includes(course.id)) current.courseIds.push(course.id);
      modules.set(id, current);
    }
  }
  return { modules: [...modules.values()], courses };
}

/**
 * Accepts the published list the sales API returns today (courses, each with its modules)
 * and a list that already separates grouping modules from courses.
 */
export function normalizeCatalog(payload: unknown): TeachingCatalog {
  const root = unwrap(payload);
  if (!root) return { modules: [], courses: [] };

  const moduleList = Array.isArray(root.modules) ? root.modules : null;
  const courseList = Array.isArray(root.courses) ? root.courses : null;
  const grouping = moduleList?.some((item) => {
    const record = asRecord(item);
    return Boolean(record && (Array.isArray(record.courseIds) || Array.isArray(record.courses)));
  });

  if (grouping && courseList) {
    return {
      modules: moduleList.map(readGroupingModule).filter((item): item is CatalogModule => Boolean(item)),
      courses: courseList.map(readCourse).filter((item): item is CatalogCourse => Boolean(item)),
    };
  }

  if (courseList) return invertNestedCourses(courseList);
  if (Array.isArray(payload)) return invertNestedCourses(payload);
  return { modules: [], courses: [] };
}

export async function listCourseCatalog(): Promise<TeachingCatalog> {
  if (catalogUsesMock()) return MOCK_COURSE_CATALOG;
  const payload = await apiRequest<unknown>(CORE_API_URL, "/sales/catalog/courses");
  return normalizeCatalog(payload);
}
