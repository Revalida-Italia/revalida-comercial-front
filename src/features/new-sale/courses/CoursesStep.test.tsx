import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CoursesStep } from "./CoursesStep";
import { emptyDraft } from "./model";
import type { CatalogCourse, CourseDraft } from "./types";

const catalog: CatalogCourse[] = [
  {
    id: "start",
    name: "Curso Start",
    thumbnailUrl: null,
    modules: [
      { id: "docs", name: "Documentação", thumbnailUrl: null },
      { id: "next", name: "Próximos passos", thumbnailUrl: "https://example.test/broken.jpg" },
    ],
  },
  {
    id: "prep",
    name: "Preparação",
    thumbnailUrl: "https://example.test/prep.jpg",
    modules: [
      { id: "pedia", name: "Pediatria", thumbnailUrl: null },
      { id: "clinic", name: "Clínica médica", thumbnailUrl: null },
    ],
  },
];

function Harness({
  loading = false,
  error = false,
  clients = ["Billy Willy"],
  onRetry = vi.fn(),
}: {
  loading?: boolean;
  error?: boolean;
  clients?: string[];
  onRetry?: () => void;
}) {
  const [draft, setDraft] = useState<CourseDraft>(() => emptyDraft("2026-08-20"));
  return (
    <CoursesStep
      catalog={loading || error ? [] : catalog}
      loading={loading}
      error={error}
      onRetry={onRetry}
      draft={draft}
      onChange={setDraft}
      clients={clients}
      onBack={vi.fn()}
      onNext={vi.fn()}
    />
  );
}

function nextButtons() {
  return screen.getAllByRole("button", { name: "Próximo" });
}

describe("Courses step", () => {
  it("asks for a course and an end date before continuing", () => {
    render(<Harness />);
    expect(screen.getByRole("heading", { name: "Cursos e módulos" })).toBeInTheDocument();
    expect(screen.queryByText("Preencha as informações passo a passo.")).toBeNull();
    for (const button of nextButtons()) expect(button).toBeDisabled();
    expect(screen.getAllByText("Escolha ao menos um curso ou módulo").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("checkbox", { name: "Curso Start" }));
    expect(screen.getAllByText("Curso inteiro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 item escolhido").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Informe o fim do acesso para continuar.").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Fim")).toHaveAttribute("placeholder", "DD/MM/AAAA");
    expect(screen.getByLabelText("Fim")).toHaveValue("");

    fireEvent.change(screen.getByLabelText("Fim"), { target: { value: "20/08/2027" } });
    fireEvent.blur(screen.getByLabelText("Fim"));
    for (const button of nextButtons()) expect(button).toBeEnabled();
  });

  it("shows a partial course, then the whole course when every module is checked", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Módulos de Preparação" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Pediatria" }));
    expect(screen.getByRole("checkbox", { name: "Preparação" })).toHaveAttribute("aria-checked", "mixed");
    expect(screen.getByText("1 de 2 módulos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Clínica médica" }));
    expect(screen.getByRole("checkbox", { name: "Preparação" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByText("1 item escolhido").length).toBeGreaterThan(0);
  });

  it("highlights a search without dropping the selection", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Curso Start" }));
    fireEvent.change(screen.getByLabelText("Buscar curso ou módulo"), { target: { value: "pedia" } });
    expect(document.querySelector("mark")?.textContent).toBe("Pedia");
    expect(screen.queryByRole("checkbox", { name: "Curso Start" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Buscar curso ou módulo"), { target: { value: "" } });
    expect(screen.getByRole("checkbox", { name: "Curso Start" })).toHaveAttribute("aria-checked", "true");
    fireEvent.change(screen.getByLabelText("Buscar curso ou módulo"), { target: { value: "radiologia" } });
    expect(screen.getByText("Nada encontrado para “radiologia”")).toBeInTheDocument();
  });

  it("toggles a course from the row and leaves the expand control alone", () => {
    render(<Harness />);
    const course = screen.getByRole("treeitem", { name: /Curso Start/ });
    fireEvent.click(within(course).getByText("Curso Start"));
    const checkbox = screen.getByRole("checkbox", { name: "Curso Start" });
    expect(checkbox).toHaveAttribute("aria-checked", "true");
    expect(course).toHaveAttribute("aria-checked", "true");

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("aria-checked", "false");

    fireEvent.click(within(course).getByText(/módulos/));
    expect(checkbox).toHaveAttribute("aria-checked", "true");

    const expand = screen.getByRole("button", { name: "Módulos de Curso Start" });
    fireEvent.click(expand);
    expect(checkbox).toHaveAttribute("aria-checked", "true");
    expect(expand).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Módulos de Preparação" }));
    fireEvent.click(screen.getByText("Pediatria"));
    expect(screen.getByRole("checkbox", { name: "Pediatria" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", { name: "Preparação" })).toHaveAttribute("aria-checked", "mixed");
  });

  it("marks a course from the keyboard and announces a partial check", () => {
    render(<Harness />);
    const course = screen.getByRole("treeitem", { name: /Curso Start/ });
    fireEvent.keyDown(course, { key: " " });
    expect(screen.getByRole("checkbox", { name: "Curso Start" })).toHaveAttribute("aria-checked", "true");
    const prep = screen.getByRole("treeitem", { name: /Preparação/ });
    fireEvent.keyDown(prep, { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("treeitem", { name: /Pediatria/ }), { key: " " });
    expect(screen.getByRole("checkbox", { name: "Preparação" })).toHaveAttribute("aria-checked", "mixed");
  });

  it("shows the skeleton, then the error and a retry", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<Harness loading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText(/Carregando/)).toBeNull();
    rerender(<Harness error onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os cursos.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("flags an end date that is not after the start", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Curso Start" }));
    fireEvent.change(screen.getByLabelText("Fim"), { target: { value: "10/08/2026" } });
    expect(screen.queryByText("O fim precisa ser depois do início.")).toBeNull();
    fireEvent.blur(screen.getByLabelText("Fim"));
    expect(screen.getByText("O fim precisa ser depois do início.")).toBeInTheDocument();
    expect(screen.getAllByText("Corrija o período de acesso para continuar.").length).toBeGreaterThan(0);
    for (const button of nextButtons()) expect(button).toBeDisabled();
  });

  it("names every client on the sale and keeps one period", () => {
    render(<Harness clients={["Paulo Gonçalves", "Ana Gonçalves"]} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Curso Start" }));
    expect(screen.getByText(/Vale para os 2 clientes desta venda: Paulo Gonçalves e Ana Gonçalves/)).toBeInTheDocument();
    expect(screen.getAllByLabelText("Início")).toHaveLength(1);
  });

  it("uses a neutral fallback when the cover is missing", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Módulos de Curso Start" }));
    const img = document.querySelector('img[src="https://example.test/broken.jpg"]');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("alt", "");
    fireEvent.error(img!);
    expect(document.querySelector('img[src="https://example.test/broken.jpg"]')).toBeNull();
  });
});
