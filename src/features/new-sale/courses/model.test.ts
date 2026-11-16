import { describe, expect, it } from "vitest";
import { setLocale } from "@/i18n";
import { clauseLines } from "./clause";
import { durationLabel } from "./copy";
import { accessLength } from "./duration";
import { normalizeCatalog } from "./catalogApi";
import {
  applyMode,
  blockReason,
  continueState,
  copyFirstDates,
  courseState,
  datesDiverge,
  draftFromItems,
  emptyDraft,
  filterCatalog,
  isLegacySale,
  listItems,
  readCourseItems,
  toCourseSaleItems,
  toggleCourse,
  toggleModule,
} from "./model";
import type { CatalogCourse, CourseSaleItem } from "./types";
import type { SaleItem } from "@/services/commercialApi";

const catalog: CatalogCourse[] = [
  {
    id: "start",
    name: "Curso Start",
    thumbnailUrl: null,
    modules: [
      { id: "docs", name: "Documentação", thumbnailUrl: null },
      { id: "next", name: "Próximos passos", thumbnailUrl: null },
    ],
  },
  {
    id: "prep",
    name: "Preparação",
    thumbnailUrl: "https://example.test/prep.jpg",
    modules: [
      { id: "clinic", name: "Clínica médica", thumbnailUrl: null },
      { id: "pedia", name: "Pediatria", thumbnailUrl: null },
      { id: "surgery", name: "Cirurgia", thumbnailUrl: null },
    ],
  },
];

function draft() {
  return emptyDraft("2026-08-20");
}

describe("course selection", () => {
  it("selects the whole course as one item and clears it again", () => {
    const chosen = toggleCourse(draft(), catalog[0]);
    expect(courseState(catalog[0], chosen.selection.start)).toBe("all");
    expect(listItems(chosen, catalog)).toHaveLength(1);
    expect(listItems(chosen, catalog)[0]).toMatchObject({ kind: "course", courseId: "start" });
    const cleared = toggleCourse(chosen, catalog[0]);
    expect(listItems(cleared, catalog)).toHaveLength(0);
  });

  it("keeps a partial course as one item per module and promotes a full set to the whole course", () => {
    let next = toggleModule(draft(), catalog[1], "clinic");
    next = toggleModule(next, catalog[1], "pedia");
    expect(courseState(catalog[1], next.selection.prep)).toBe("partial");
    expect(listItems(next, catalog).map((item) => item.moduleId)).toEqual(["clinic", "pedia"]);
    next = toggleModule(next, catalog[1], "surgery");
    expect(courseState(catalog[1], next.selection.prep)).toBe("all");
    expect(listItems(next, catalog)).toEqual([expect.objectContaining({ kind: "course", courseId: "prep" })]);
  });

  it("filters locally and opens the course that owns the match", () => {
    const matches = filterCatalog(catalog, "pedia");
    expect(matches.map((match) => match.course.id)).toEqual(["prep"]);
    expect(matches[0].open).toBe(true);
    expect(matches[0].modules.map((mod) => mod.name)).toEqual(["Pediatria"]);
    expect(filterCatalog(catalog, "radiologia")).toEqual([]);
    const kept = toggleCourse(draft(), catalog[0]);
    expect(listItems(kept, catalog)).toHaveLength(1);
    expect(filterCatalog(catalog, "")).toHaveLength(catalog.length);
  });
});

describe("access dates", () => {
  it("starts on the sale date and leaves the end empty in both modes", () => {
    const same = toggleCourse(draft(), catalog[0]);
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
    let next = toggleCourse(draft(), catalog[0]);
    next = { ...next, sharedEnd: "2026-08-20", touched: { "shared-end": true } };
    expect(continueState(next, catalog)).toMatchObject({ ok: false, tone: "error", message: "invalid" });
    next = { ...next, sharedEnd: "2027-08-20" };
    expect(continueState(next, catalog).ok).toBe(true);
  });

  it("copies the first row and asks before collapsing different dates", () => {
    let next = applyMode(toggleModule(toggleModule(draft(), catalog[1], "clinic"), catalog[1], "pedia"), "item", catalog);
    next = {
      ...next,
      perItem: {
        ...next.perItem,
        "module:prep:pedia": { startsAt: "2026-09-01", endsAt: "2027-01-01" },
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
      { kind: "module", courseId: "prep", moduleId: "pedia", name: "Pediatria", courseName: "Preparação", startsAt: "2026-09-01", endsAt: "2027-03-01" },
    ];
    const next = draftFromItems(saved, "2026-08-20");
    expect(next.mode).toBe("item");
    expect(listItems(next, catalog).map((item) => [item.kind, item.endsAt])).toEqual([
      ["course", "2027-08-20"],
      ["module", "2027-03-01"],
    ]);
    const sent = toCourseSaleItems(next, catalog);
    expect(sent[0]).toEqual({ kind: "course", courseId: "start", startsAt: "2026-08-20", endsAt: "2027-08-20" });
    expect(sent[1]).toEqual({
      kind: "module",
      courseId: "prep",
      moduleId: "pedia",
      startsAt: "2026-09-01",
      endsAt: "2027-03-01",
    });
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
      data: { courses: [{ id: "start", name: "Curso Start", thumbnailUrl: null, modules: [{ id: "docs", name: "Documentação", thumbnailUrl: null }] }] },
    })).toEqual([
      { id: "start", name: "Curso Start", thumbnailUrl: null, modules: [{ id: "docs", name: "Documentação", thumbnailUrl: null }] },
    ]);
    expect(normalizeCatalog({
      courses: [{ id: "start", name: "Curso Start", thumbnailUrl: null, modules: [{ id: "docs", name: "Documentação" }] }],
    })).toEqual([
      { id: "start", name: "Curso Start", thumbnailUrl: null, modules: [{ id: "docs", name: "Documentação", thumbnailUrl: null }] },
    ]);
    expect(normalizeCatalog([
      { kind: "course", courseId: "start", name: "Curso Start" },
      { kind: "module", courseId: "start", moduleId: "docs", name: "Documentação" },
    ])).toEqual([
      { id: "start", name: "Curso Start", thumbnailUrl: null, modules: [{ id: "docs", name: "Documentação", thumbnailUrl: null }] },
    ]);
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
