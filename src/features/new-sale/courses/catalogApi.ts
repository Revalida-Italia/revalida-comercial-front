import { apiRequest } from "@/lib/http";
import { MOCK_COURSE_CATALOG } from "./mockCatalog";
import type { CatalogCourse, CatalogModule } from "./types";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

/** Real list, unless local QA asks for the sample catalog. */
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

function readModule(raw: unknown, courseId: string): CatalogModule | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = text(record.id ?? record.moduleId);
  const name = text(record.name ?? record.title);
  if (!id || !name) return null;
  const owner = text(record.courseId);
  if (owner && owner !== courseId) return null;
  return { id, name, thumbnailUrl: imageUrl(record) };
}

function readCourse(raw: unknown): CatalogCourse | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = text(record.id ?? record.courseId);
  const name = text(record.name ?? record.title);
  if (!id || !name) return null;
  const modules = Array.isArray(record.modules)
    ? record.modules.map((item) => readModule(item, id)).filter((item): item is CatalogModule => Boolean(item))
    : [];
  return { id, name, thumbnailUrl: imageUrl(record), modules };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  if (Array.isArray(record.courses)) return record.courses;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.data)) return record.data;
  const data = asRecord(record.data);
  if (!data) return [];
  if (Array.isArray(data.courses)) return data.courses;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function isFlatItem(raw: unknown): boolean {
  const record = asRecord(raw);
  if (!record) return false;
  const kind = text(record.kind);
  return kind === "course" || kind === "module";
}

/** Accepts a nested course list or a flat course/module list from the same endpoint. */
export function normalizeCatalog(payload: unknown): CatalogCourse[] {
  const list = unwrapList(payload);
  if (list.length === 0) return [];

  if (!list.some(isFlatItem)) {
    return list.map(readCourse).filter((course): course is CatalogCourse => Boolean(course));
  }

  const courses = new Map<string, CatalogCourse>();
  for (const raw of list) {
    const record = asRecord(raw);
    if (!record) continue;
    const kind = text(record.kind);
    const courseId = text(record.courseId ?? record.id);
    if (!courseId) continue;
    let course = courses.get(courseId);
    if (!course) {
      course = { id: courseId, name: "", thumbnailUrl: null, modules: [] };
      courses.set(courseId, course);
    }
    if (kind === "module") {
      const mod = readModule(raw, courseId);
      if (mod && !course.modules.some((item) => item.id === mod.id)) course.modules.push(mod);
      continue;
    }
    const name = text(record.name ?? record.title);
    if (name) course.name = name;
    course.thumbnailUrl = course.thumbnailUrl ?? imageUrl(record);
  }

  return [...courses.values()].filter((course) => course.name);
}

export async function listCourseCatalog(): Promise<CatalogCourse[]> {
  if (catalogUsesMock()) return MOCK_COURSE_CATALOG.map((course) => ({ ...course, modules: course.modules.map((mod) => ({ ...mod })) }));
  const payload = await apiRequest<unknown>(CORE_API_URL, "/sales/catalog/courses");
  return normalizeCatalog(payload);
}
