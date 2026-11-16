import type { CatalogCourse } from "./types";

/**
 * Example catalog for local QA when the teaching list is not available yet.
 * Names here are sample data, not the live course list.
 * Turn it on with VITE_COURSE_CATALOG=mock.
 */
export const MOCK_COURSE_CATALOG: CatalogCourse[] = [
  {
    id: "course-start",
    name: "Curso Start",
    thumbnailUrl: null,
    modules: [
      { id: "start-docs", name: "Documentação do processo", thumbnailUrl: null },
      { id: "start-translation", name: "Tradução e apostilamento", thumbnailUrl: null },
      { id: "start-diploma", name: "Equivalência do diploma", thumbnailUrl: null },
      { id: "start-order", name: "Inscrição na Ordem", thumbnailUrl: null },
      { id: "start-next", name: "Próximos passos", thumbnailUrl: null },
    ],
  },
  {
    id: "course-prep",
    name: "Preparação para as provas de revalidação",
    thumbnailUrl: null,
    modules: [
      { id: "prep-clinic", name: "Clínica médica", thumbnailUrl: null },
      { id: "prep-surgery", name: "Cirurgia", thumbnailUrl: null },
      { id: "prep-pedia", name: "Pediatria", thumbnailUrl: null },
      { id: "prep-gyn", name: "Ginecologia e obstetrícia", thumbnailUrl: null },
      { id: "prep-public", name: "Saúde pública", thumbnailUrl: null },
      { id: "prep-sims", name: "Simulados", thumbnailUrl: null },
    ],
  },
  {
    id: "course-medico",
    name: "Italiano Médico",
    thumbnailUrl: null,
    modules: [
      { id: "med-a1", name: "Nível A1", thumbnailUrl: null },
      { id: "med-a2", name: "Nível A2", thumbnailUrl: null },
      { id: "med-b1", name: "Nível B1", thumbnailUrl: null },
      { id: "med-b2", name: "Nível B2", thumbnailUrl: null },
    ],
  },
  {
    id: "course-quattro",
    name: "Italiano Quattromani",
    thumbnailUrl: null,
    modules: [
      { id: "qm-talk", name: "Conversação", thumbnailUrl: null },
      { id: "qm-vocab", name: "Vocabulário clínico", thumbnailUrl: null },
      { id: "qm-practice", name: "Prática com pacientes", thumbnailUrl: null },
    ],
  },
];
