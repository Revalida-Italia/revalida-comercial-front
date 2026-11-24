import type { TeachingCatalog } from "./types";

/** Sample catalog for local QA. Not the live product list. */
export const MOCK_COURSE_CATALOG: TeachingCatalog = {
  modules: [
    {
      id: "mod-clinic",
      name: "Clínica médica",
      thumbnailUrl: null,
      courseIds: ["course-clinic-1", "course-clinic-2", "course-prevent"],
      visibleInCommercial: true,
    },
    {
      id: "mod-prep",
      name: "Preparação para as provas",
      thumbnailUrl: "https://example.test/prep.jpg",
      courseIds: ["course-pedia", "course-clinic-1"],
      visibleInCommercial: true,
    },
    {
      id: "mod-hidden",
      name: "Módulo interno",
      thumbnailUrl: null,
      courseIds: ["course-start"],
      visibleInCommercial: false,
    },
  ],
  courses: [
    { id: "course-start", name: "Curso Start", thumbnailUrl: "https://example.test/broken.jpg" },
    { id: "course-clinic-1", name: "Clínica Médica I", thumbnailUrl: null },
    { id: "course-clinic-2", name: "Clínica Médica II", thumbnailUrl: null },
    { id: "course-prevent", name: "Medicina Preventiva", thumbnailUrl: null },
    { id: "course-pedia", name: "Pediatria", thumbnailUrl: null },
  ],
};
