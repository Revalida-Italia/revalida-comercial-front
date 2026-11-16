import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CoursesStep } from "./CoursesStep";
import { emptyDraft } from "./model";
import type { CourseDraft, TeachingCatalog } from "./types";

const catalog: TeachingCatalog = {
  modules: [
    { id: "mod-clinic", name: "Clínica médica", thumbnailUrl: null, courseIds: ["clinic-1", "pedia"] },
  ],
  courses: [
    { id: "start", name: "Curso Start", thumbnailUrl: "https://example.test/broken.jpg" },
    { id: "clinic-1", name: "Clínica Médica I", thumbnailUrl: null },
    { id: "pedia", name: "Pediatria", thumbnailUrl: null },
  ],
};

function Harness({ loading = false, error = false, onRetry = vi.fn() }: { loading?: boolean; error?: boolean; onRetry?: () => void }) {
  const [draft, setDraft] = useState<CourseDraft>(() => emptyDraft("2026-08-20"));
  return (
    <CoursesStep
      catalog={loading || error ? { modules: [], courses: [] } : catalog}
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
  it("toggles a course from the row once and does not offer a chevron", () => {
    render(<Harness />);
    expect(screen.queryByRole("button", { name: /Módulos de/ })).toBeNull();
    const course = screen.getByRole("checkbox", { name: /Curso Start/ });
    fireEvent.click(course);
    expect(course).toHaveAttribute("aria-checked", "true");
    fireEvent.click(course);
    expect(course).toHaveAttribute("aria-checked", "false");
    fireEvent.keyDown(course, { key: " " });
    expect(course).toHaveAttribute("aria-checked", "true");
  });

  it("locks a course that belongs to a selected module", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Clínica médica/ }));
    const included = screen.getAllByRole("checkbox", { name: /Pediatria/ }).find((item) => item.getAttribute("aria-disabled") === "true" || item.textContent?.startsWith("Pediatria")) ?? screen.getAllByRole("checkbox", { name: /Pediatria/ })[1];
    expect(included).toHaveAttribute("aria-checked", "true");
    expect(included).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText("Incluso no módulo Clínica médica").length).toBeGreaterThan(0);
    fireEvent.click(included);
    expect(included).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByText("1 item escolhido").length).toBeGreaterThan(0);
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
