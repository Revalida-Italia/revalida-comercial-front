import { describe, expect, it } from "vitest";
import { setLocale } from "@/i18n";
import { clauseLines } from "./clause";
import { durationLabel } from "./copy";
import { accessLength } from "./duration";
import { normalizeCatalog } from "./catalogApi";
import {
  applyMode,
  blockReason,
  commercialModules,
  continueState,
  copyFirstDates,
  datesDiverge,
  draftFromItems,
  emptyDraft,
  filterCatalog,
  isLegacySale,
  listItems,
  readCourseItems,
  servicesFromRecord,
  toCourseSaleItems,
  toggleCourse,
  toggleModule,
} from "./model";
import type { CourseSaleItem, TeachingCatalog } from "./types";
import type { SaleItem } from "@/services/commercialApi";

const catalog: TeachingCatalog = {
  modules: [
    { id: "mod-clinic", name: "Clínica médica", thumbnailUrl: null, courseIds: ["clinic-1", "pedia"], visibleInCommercial: true },
    { id: "mod-prep", name: "Preparação", thumbnailUrl: null, courseIds: ["pedia"], visibleInCommercial: true },
  ],
  courses: [
    { id: "start", name: "Curso Start", thumbnailUrl: null },
    { id: "clinic-1", name: "Clínica Médica I", thumbnailUrl: null },
    { id: "pedia", name: "Pediatria", thumbnailUrl: null },
  ],
};

function draft() {
  return emptyDraft("2026-08-20");
}

describe("course selection", () => {
  it("selects a course as one item and clears it again", () => {
    const chosen = toggleCourse(draft(), catalog, catalog.courses[0]);
    expect(listItems(chosen, catalog)).toEqual([expect.objectContaining({ kind: "course", courseId: "start" })]);
    const cleared = toggleCourse(chosen, catalog, catalog.courses[0]);
    expect(listItems(cleared, catalog)).toHaveLength(0);
  });

  it("locks the courses of a selected module and does not duplicate them", () => {
    let next = toggleCourse(draft(), catalog, catalog.courses[2]);
    expect(listItems(next, catalog)).toHaveLength(1);
    next = toggleModule(next, catalog.modules[0]);
    expect(listItems(next, catalog).map((item) => item.kind)).toEqual(["module"]);
    expect(next.courses).not.toContain("pedia");
    const sent = toCourseSaleItems(next, catalog);
    expect(sent).toEqual([expect.objectContaining({ kind: "module", moduleId: "mod-clinic" })]);
    expect(sent[0]).not.toHaveProperty("courseId");
    const cleared = toggleModule(next, catalog.modules[0]);
    expect(listItems(cleared, catalog)).toHaveLength(0);
  });

  it("filters a course and the modules that contain it", () => {
    const matches = filterCatalog(catalog, "pedia");
    expect(matches.courses).toEqual([]);
    expect(matches.modules.map((mod) => mod.id)).toEqual(["mod-clinic", "mod-prep"]);
    expect(filterCatalog(catalog, "radiologia")).toEqual({ modules: [], courses: [] });
  });

  it("keeps only modules marked visible and lists a duplicated module once", () => {
    const source: TeachingCatalog = {
      modules: [
        { id: "pri-1", name: "PRI", thumbnailUrl: null, courseIds: ["a"], visibleInCommercial: true },
        { id: "pri-1", name: "PRI", thumbnailUrl: null, courseIds: ["b"], visibleInCommercial: true },
        { id: "pri-2", name: " PRI ", thumbnailUrl: null, courseIds: ["c"], visibleInCommercial: true },
        { id: "hidden", name: "Oculto", thumbnailUrl: null, courseIds: ["loose"], visibleInCommercial: false },
        { id: "unmarked", name: "Sem marca", thumbnailUrl: null, courseIds: ["loose"] },
        { id: "prep", name: "Preparação", thumbnailUrl: null, courseIds: ["pedia"], visibleInCommercial: true },
      ],
      courses: [
        { id: "a", name: "Curso A", thumbnailUrl: null },
        { id: "loose", name: "Curso avulso", thumbnailUrl: null },
        { id: "pedia", name: "Pediatria", thumbnailUrl: null },
      ],
    };
    expect(commercialModules(source).map((mod) => [mod.id, mod.courseIds])).toEqual([
      ["pri-1", ["a", "b", "c"]],
      ["prep", ["pedia"]],
    ]);
    expect(filterCatalog(source, "").courses).toEqual([]);
    expect(filterCatalog(source, "avulso")).toEqual({ modules: [], courses: [] });
    expect(filterCatalog(source, "pedia").modules.map((mod) => mod.id)).toEqual(["prep"]);
  });
});

describe("access dates", () => {
  it("starts on the sale date and leaves the end empty in both modes", () => {
    const same = toggleCourse(draft(), catalog, catalog.courses[0]);
    expect(listItems(same, catalog)[0]).toMatchObject({ startsAt: "2026-08-20", endsAt: "" });
    expect(continueState(same, catalog).message).toBe("end");
    const perItem = applyMode(same, "item", catalog);
    expect(listItems(perItem, catalog)[0].endsAt).toBe("");
    const sent = toCourseSaleItems(perItem, catalog)[0];
    expect(sent).toMatchObject({ kind: "course", endsAt: "" });
    expect(sent).not.toHaveProperty("name");
    expect(sent).not.toHaveProperty("courseName");
  });

  it("blocks an end that is not after the start until the field is corrected", () => {
    let next = toggleCourse(draft(), catalog, catalog.courses[0]);
    next = { ...next, sharedEnd: "2026-08-20", touched: { "shared-end": true } };
    expect(continueState(next, catalog)).toMatchObject({ ok: false, tone: "error", message: "invalid" });
    next = { ...next, sharedEnd: "2027-08-20" };
    expect(continueState(next, catalog).ok).toBe(true);
  });

  it("copies the first row and asks before collapsing different dates", () => {
    let next = applyMode(toggleModule(toggleModule(draft(), catalog.modules[0]), catalog.modules[1]), "item", catalog);
    next = {
      ...next,
      perItem: {
        ...next.perItem,
        "module:mod-prep": { startsAt: "2026-09-01", endsAt: "2027-01-01" },
      },
    };
    expect(datesDiverge(next, catalog)).toBe(true);
    const copied = copyFirstDates(next, catalog);
    expect(listItems(copied, catalog).map((item) => item.endsAt)).toEqual(["", ""]);
    const collapsed = applyMode(copied, "same", catalog);
    expect(collapsed.mode).toBe("same");
    expect(collapsed.sharedEnd).toBe("");
  });

  it("rounds whole months and keeps short spans in days", () => {
    expect(accessLength("2026-08-20", "2027-08-20")).toEqual({ unit: "month", count: 12 });
    expect(accessLength("2026-08-20", "2026-09-20")).toEqual({ unit: "month", count: 1 });
    expect(accessLength("2026-08-20", "2026-08-30")).toEqual({ unit: "day", count: 10 });
    expect(accessLength("2026-08-20", "2026-08-20")).toBeNull();
    expect(durationLabel("2026-08-20", "2026-08-30", "short")).toBe("10 dias");
    expect(durationLabel("2026-08-20", "2026-09-20", "short")).toBe("1 mês");
    expect(durationLabel("2026-08-20", "2027-08-20", "access")).toBe("12 meses de acesso");
    expect(durationLabel("2026-08-20", "2026-08-21", "short")).not.toBe("1 dias");
  });
});

describe("legacy and saved sales", () => {
  it("treats product rows as legacy and course rows as the new sale", () => {
    const legacy = [{ productId: "p1", kind: null, courseId: null }] as SaleItem[];
    const courses = [{ productId: null, kind: "course", courseId: "start" }] as SaleItem[];
    expect(isLegacySale(legacy)).toBe(true);
    expect(isLegacySale(courses)).toBe(false);
    expect(isLegacySale([])).toBe(false);
    expect(blockReason(draft(), catalog)).toBe("empty");
  });

  it("reopens a saved sale with its dates and freezes the names", () => {
    const saved: CourseSaleItem[] = [
      { kind: "course", courseId: "start", name: "Curso Start", courseName: "Curso Start", startsAt: "2026-08-20", endsAt: "2027-08-20" },
      { kind: "module", moduleId: "mod-prep", name: "Preparação", courseName: "Preparação", startsAt: "2026-09-01", endsAt: "2027-03-01" },
    ];
    const next = draftFromItems(saved, "2026-08-20");
    expect(next.mode).toBe("item");
    expect(listItems(next, catalog).map((item) => [item.kind, item.endsAt])).toEqual([
      ["module", "2027-03-01"],
      ["course", "2027-08-20"],
    ]);
    const sent = toCourseSaleItems(next, catalog);
    expect(sent[0]).toEqual({ kind: "module", moduleId: "mod-prep", startsAt: "2026-09-01", endsAt: "2027-03-01" });
    expect(sent[1]).toEqual({ kind: "course", courseId: "start", startsAt: "2026-08-20", endsAt: "2027-08-20" });
  });

  it("reads course rows and ignores a generic product", () => {
    const items = readCourseItems([
      { id: "a", saleId: "s", productId: "p", releaseDate: "2026-01-01", kind: null, courseId: null, name: null, courseName: null, createdAt: "", updatedAt: "" },
      { id: "b", saleId: "s", kind: "module", courseId: "prep", moduleId: "pedia", name: "Pediatria", courseName: "Preparação", startsAt: "2026-09-01", endsAt: "2027-03-01", createdAt: "", updatedAt: "" },
    ] as SaleItem[]);
    expect(items).toEqual([
      expect.objectContaining({ kind: "module", courseId: "prep", moduleId: "pedia", name: "Pediatria" }),
    ]);
    expect(readCourseItems([{
      id: "c",
      saleId: "s",
      kind: "module",
      courseId: "prep",
      moduleId: "pedia",
      courseName: "Preparação",
      moduleName: "Pediatria",
      startsAt: "2026-09-01",
      endsAt: "2027-03-01",
      createdAt: "",
      updatedAt: "",
    } as SaleItem])).toEqual([
      expect.objectContaining({ name: "Pediatria", courseName: "Preparação" }),
    ]);
    expect(isLegacySale([], "legacy")).toBe(true);
    expect(isLegacySale([{ kind: "course", courseId: "start" }], "courses")).toBe(false);
  });
});

describe("catalog and contract lines", () => {
  it("normalizes a nested list and a flat list without a second request shape", () => {
    expect(normalizeCatalog({
      success: true,
      data: {
        modules: [{ id: "docs", name: "Documentação", thumbnailUrl: null, courseIds: ["start"] }],
        courses: [{ id: "start", name: "Curso Start", thumbnailUrl: null }],
      },
    })).toEqual({
      modules: [{ id: "docs", name: "Documentação", thumbnailUrl: null, courseIds: ["start"] }],
      courses: [{ id: "start", name: "Curso Start", thumbnailUrl: null }],
    });
    expect(normalizeCatalog({
      success: true,
      data: {
        data: {
          modules: [{ id: "mod-1", name: "Clínica médica", thumbnailUrl: null, courseIds: ["c1", "c2"] }],
          courses: [
            { id: "c1", name: "Clínica I", thumbnailUrl: null },
            { id: "c2", name: "Clínica II", thumbnailUrl: null },
          ],
        },
      },
    }).modules[0]?.courseIds).toEqual(["c1", "c2"]);
    expect(normalizeCatalog({
      data: {
        modules: [{
          id: "mod-legal",
          name: "Medicina Legal",
          courseIds: [{ id: "legal-1", name: "Medicina Legal I" }],
        }],
        courses: [],
      },
    })).toMatchObject({
      modules: [{ id: "mod-legal", courseIds: ["legal-1"] }],
      courses: [{ id: "legal-1", name: "Medicina Legal I" }],
    });
    expect(normalizeCatalog({
      courses: [{ id: "start", name: "Curso Start", thumbnailUrl: null, modules: [{ id: "docs", name: "Documentação" }] }],
    }).modules).toEqual([
      { id: "docs", name: "Documentação", thumbnailUrl: null, courseIds: ["start"] },
    ]);
    expect(normalizeCatalog({
      modules: [
        { id: "pri", name: "PRI", courseIds: ["a"], visibleInCommercial: true },
        { id: "hidden", name: "Oculto", courseIds: ["b"], visibleInCommercial: false },
        { id: "plain", name: "Sem marca", courseIds: ["c"] },
      ],
      courses: [{ id: "a", name: "Curso A", thumbnailUrl: null }],
    }).modules).toEqual([
      { id: "pri", name: "PRI", thumbnailUrl: null, courseIds: ["a"], visibleInCommercial: true },
      { id: "hidden", name: "Oculto", thumbnailUrl: null, courseIds: ["b"], visibleInCommercial: false },
      { id: "plain", name: "Sem marca", thumbnailUrl: null, courseIds: ["c"] },
    ]);
  });

  it("lists a saved module when the catalog array is missing", () => {
    const draft = draftFromItems([{
      kind: "module",
      moduleId: "mod-1",
      name: "Clínica médica",
      courseName: "Clínica médica",
      moduleName: "Clínica médica",
      startsAt: "2026-08-20",
      endsAt: "2027-08-20",
    }], "2026-08-20");
    expect(listItems(draft, [] as never).map((item) => item.name)).toEqual(["Clínica médica"]);
    expect(servicesFromRecord({ translationIncluded: true }).translation).toBe(true);
    const named = draftFromItems([{
      kind: "module",
      moduleId: "other-id",
      name: "Medicina Legal",
      courseName: "Medicina Legal",
      moduleName: "Medicina Legal",
      startsAt: "2026-08-20",
      endsAt: "2027-08-20",
    }], "2026-08-20");
    const listed = listItems(named, {
      modules: [{ id: "mod-legal", name: "Medicina Legal", thumbnailUrl: null, courseIds: ["legal-1"] }],
      courses: [{ id: "legal-1", name: "Medicina Legal I", thumbnailUrl: null }],
    });
    expect(listed[0]?.courseCount).toBe(1);
    expect(listed[0]?.courseNames).toEqual(["Medicina Legal I"]);
  });

  it("writes one clause line per item", () => {
    setLocale("pt-BR");
    const lines = clauseLines([
      { kind: "course", courseId: "start", name: "Curso Start", courseName: "Curso Start", startsAt: "2026-08-20", endsAt: "2027-08-20" },
      { kind: "module", courseId: "prep", moduleId: "pedia", name: "Pediatria", courseName: "Preparação", startsAt: "2026-09-01", endsAt: "2027-03-01" },
    ]);
    expect(lines[0]).toBe("(a) Curso Start: curso inteiro. Disponível de 20/08/2026 a 20/08/2027.");
    expect(lines[1]).toBe("(b) Preparação — módulo Pediatria. Disponível de 01/09/2026 a 01/03/2027.");
  });
});
