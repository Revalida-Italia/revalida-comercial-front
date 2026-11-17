import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleRecord } from "@/services/commercialApi";
import { draftFromItems, readCourseItems, servicesFromRecord } from "@/features/new-sale/courses/model";
import { buildCourseSummary } from "@/features/new-sale/courses/copy";
import SaleDetailPreview from "./SaleDetailPreview";
import SaleListCard from "./SaleListCard";

vi.mock("@/features/new-sale/courses/catalogApi", () => ({
  listCourseCatalog: vi.fn(),
}));

const { listCourseCatalog } = await import("@/features/new-sale/courses/catalogApi");

beforeEach(() => {
  vi.mocked(listCourseCatalog).mockResolvedValue({ modules: [], courses: [] });
});

/** A legacy sale as the staging API can send it: no lists and no service flags. */
function legacySale(): SaleRecord {
  return {
    id: "4ca850af-1b34-406d-9c3f-55e42357de6c",
    sellerId: "seller-1",
    currency: "BRL",
    status: "PENDING",
    contractValue: 1000,
    createdAt: "2026-08-20T12:00:00.000Z",
    updatedAt: "2026-08-20T12:00:00.000Z",
    soldAt: "2026-08-20",
    seller: { name: "Ana Vendedora" },
  } as SaleRecord;
}

function renderPreview(sale: SaleRecord, extra?: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SaleDetailPreview sale={sale} readOnly />
        {extra}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("legacy sale without list fields", () => {
  it("renders the detail and the list card when items, payments, clients and services are missing", () => {
    const sale = legacySale();
    renderPreview(sale, <SaleListCard sale={sale} />);

    expect(screen.getAllByText("Ana Vendedora").length).toBeGreaterThan(0);
    expect(screen.getByText("Nenhum cliente adicionado")).toBeInTheDocument();
    expect(screen.getByText("Nenhum pagamento configurado")).toBeInTheDocument();
  });

  it("renders a course item even when the catalog and its course ids are missing", () => {
    vi.mocked(listCourseCatalog).mockResolvedValue({ modules: [], courses: [] });
    const sale = {
      ...legacySale(),
      items: [{ id: "i1", saleId: "legacy", kind: "module", moduleId: "mod-1", moduleName: "Clínica médica", startsAt: "2026-08-20", endsAt: "2027-08-20" }],
    } as SaleRecord;

    renderPreview(sale);

    expect(screen.getByText("Clínica médica")).toBeInTheDocument();
  });

  it("lists the module courses from the published catalog", async () => {
    vi.mocked(listCourseCatalog).mockResolvedValue({
      modules: [{ id: "mod-1", name: "Clínica médica", thumbnailUrl: null, courseIds: ["c1", "c2"] }],
      courses: [
        { id: "c1", name: "Clínica I", thumbnailUrl: null },
        { id: "c2", name: "Clínica II", thumbnailUrl: null },
      ],
    });
    const sale = {
      ...legacySale(),
      items: [{ id: "i1", saleId: "legacy", kind: "module", moduleId: "mod-1", moduleName: "Clínica médica", startsAt: "2026-08-20", endsAt: "2027-08-20" }],
    } as SaleRecord;

    renderPreview(sale);

    expect(await screen.findByText("Módulo · 2 cursos")).toBeInTheDocument();
    expect(screen.getByText("Clínica I, Clínica II")).toBeInTheDocument();
    expect(screen.queryByText("Módulo · 0 cursos")).not.toBeInTheDocument();
  });

  it("uses the course ids saved on the module and hides a zero count", async () => {
    vi.mocked(listCourseCatalog).mockResolvedValue({
      modules: [],
      courses: [
        { id: "c1", name: "Clínica I", thumbnailUrl: null },
        { id: "c2", name: "Clínica II", thumbnailUrl: null },
      ],
    });
    const sale = {
      ...legacySale(),
      items: [{
        id: "i1",
        saleId: "legacy",
        kind: "module",
        moduleId: "mod-1",
        moduleName: "Clínica médica",
        courseIds: ["c1", "c2"],
        startsAt: "2026-08-20",
        endsAt: "2027-08-20",
      }],
    } as SaleRecord;
    renderPreview(sale);
    expect(await screen.findByText("Módulo · 2 cursos")).toBeInTheDocument();
    expect(screen.getByText("Clínica I, Clínica II")).toBeInTheDocument();

    vi.mocked(listCourseCatalog).mockResolvedValue({ modules: [], courses: [] });
    renderPreview({
      ...sale,
      items: [{ ...sale.items[0], courseIds: [] }],
    } as SaleRecord);
    expect(screen.getAllByText("Clínica médica").length).toBeGreaterThan(0);
    expect(screen.queryByText(/0 cursos/)).not.toBeInTheDocument();
  });

  it("shows Tradução juramentada as included when the sale saved it as Sim", () => {
    const sale = {
      ...legacySale(),
      translationIncluded: true,
      items: [{ id: "i1", saleId: "legacy", kind: "module", moduleId: "mod-1", moduleName: "Clínica médica", startsAt: "2026-08-20", endsAt: "2027-08-20" }],
    } as SaleRecord;
    const items = readCourseItems(sale.items);
    const summary = buildCourseSummary(
      { ...draftFromItems(items, items[0]?.startsAt || ""), services: servicesFromRecord(sale) },
      { modules: [], courses: [] },
      [],
    );

    expect(summary.notIncluded).not.toContain("Tradução juramentada");
    expect(summary.notIncluded).toContain("Apostila de Haia");
    renderPreview(sale);
    expect(screen.getByText("Clínica médica")).toBeInTheDocument();
  });
});
