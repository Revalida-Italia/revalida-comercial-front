import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CoursesStep } from "./CoursesStep";
import { emptyDraft, toggleModule } from "./model";
import type { CourseDraft, TeachingCatalog } from "./types";

const catalog: TeachingCatalog = {
  modules: [
    { id: "mod-clinic", name: "Clínica médica", thumbnailUrl: null, courseIds: ["clinic-1", "pedia"], visibleInCommercial: true },
    { id: "pri-a", name: "PRI", thumbnailUrl: null, courseIds: ["pedia"], visibleInCommercial: true },
    { id: "pri-b", name: "PRI", thumbnailUrl: null, courseIds: ["clinic-1"], visibleInCommercial: true },
    { id: "hidden", name: "Módulo interno", thumbnailUrl: null, courseIds: ["start"], visibleInCommercial: false },
  ],
  courses: [
    { id: "start", name: "Curso Start", thumbnailUrl: "https://example.test/broken.jpg" },
    { id: "clinic-1", name: "Clínica Médica I", thumbnailUrl: null },
    { id: "pedia", name: "Pediatria", thumbnailUrl: null },
  ],
};

function Harness({
  loading = false,
  error = false,
  onRetry = vi.fn(),
  source = catalog,
}: {
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  source?: TeachingCatalog;
}) {
  const [draft, setDraft] = useState<CourseDraft>(() => emptyDraft("2026-08-20"));
  return (
    <CoursesStep
      catalog={loading || error ? { modules: [], courses: [] } : source}
      loading={loading}
      error={error}
      onRetry={onRetry}
      draft={draft}
      onChange={setDraft}
      clients={["Billy Willy"]}
      onBack={vi.fn()}
      onNext={vi.fn()}
    />
  );
}

describe("Courses step", () => {
  it("shows the sold courses without edit controls after a student exists", () => {
    const draft = toggleModule(emptyDraft("2026-08-20"), catalog.modules[0]);
    const dated = { ...draft, sharedEnd: "2027-08-20" };
    render(
      <CoursesStep
        catalog={catalog}
        loading={false}
        error={false}
        onRetry={vi.fn()}
        draft={dated}
        onChange={vi.fn()}
        clients={["Billy Willy"]}
        onBack={vi.fn()}
        onNext={vi.fn()}
        locked
      />,
    );
    expect(screen.getByText("Clínica médica")).toBeInTheDocument();
    expect(screen.getByText(/Para alterar o acesso de um aluno/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar curso ou módulo")).not.toBeInTheDocument();
  });

  it("selects a module and keeps its courses inside the row", () => {
    render(<Harness />);
    expect(screen.queryByRole("button", { name: /Módulos de/ })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /^Curso Start/ })).toBeNull();
    expect(screen.queryByText("Módulo interno")).toBeNull();
    expect(screen.getAllByRole("checkbox", { name: /PRI/ })).toHaveLength(1);
    const module = screen.getByRole("checkbox", { name: /Clínica médica/ });
    expect(module).toHaveTextContent("Clínica Médica I");
    expect(module).toHaveTextContent("Pediatria");
    fireEvent.click(module);
    expect(module).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByText("1 item escolhido").length).toBeGreaterThan(0);
    fireEvent.click(module);
    expect(module).toHaveAttribute("aria-checked", "false");
    fireEvent.keyDown(module, { key: " " });
    expect(module).toHaveAttribute("aria-checked", "true");
  });

  it("finds a module by a course inside it and does not list that course alone", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Buscar curso ou módulo"), { target: { value: "Pediatria" } });
    expect(screen.getByRole("checkbox", { name: /Clínica médica/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /PRI/ })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /^Pediatria/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Buscar curso ou módulo"), { target: { value: "Curso Start" } });
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByText("Nada encontrado para “Curso Start”")).toBeInTheDocument();
  });

  it("explains when no module is available for sale", () => {
    render(
      <Harness
        source={{
          modules: [{ id: "hidden", name: "Módulo interno", thumbnailUrl: null, courseIds: ["start"], visibleInCommercial: false }],
          courses: [{ id: "start", name: "Curso Start", thumbnailUrl: null }],
        }}
      />,
    );
    expect(screen.getByText("Nenhum módulo liberado para venda")).toBeInTheDocument();
    expect(screen.getByText(/Quando a equipe liberar um módulo/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText("Curso Start")).toBeNull();
  });

  it("starts every additional service on Não", () => {
    render(<Harness />);
    for (const name of ["Tradução juramentada", "Apostila de Haia", "Despesas postais", "Decreto"]) {
      const group = screen.getByRole("radiogroup", { name });
      expect(group.querySelector("[aria-checked='true']")).toHaveTextContent("Não");
    }
  });

  it("shows the skeleton, then the error and a retry", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<Harness loading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    rerender(<Harness error onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os cursos.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
