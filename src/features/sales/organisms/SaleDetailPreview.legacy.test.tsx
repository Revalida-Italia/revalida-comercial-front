import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { SaleRecord } from "@/services/commercialApi";
import { draftFromItems, readCourseItems, servicesFromRecord } from "@/features/new-sale/courses/model";
import { buildCourseSummary } from "@/features/new-sale/courses/copy";
import SaleDetailPreview from "./SaleDetailPreview";
import SaleListCard from "./SaleListCard";

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

describe("legacy sale without list fields", () => {
  it("renders the detail and the list card when items, payments, clients and services are missing", () => {
    const sale = legacySale();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <SaleDetailPreview sale={sale} readOnly />
          <SaleListCard sale={sale} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getAllByText("Ana Vendedora").length).toBeGreaterThan(0);
    expect(screen.getByText("Nenhum cliente adicionado")).toBeInTheDocument();
    expect(screen.getByText("Nenhum pagamento configurado")).toBeInTheDocument();
  });

  it("renders a course item even when the catalog and its course ids are missing", () => {
    const sale = {
      ...legacySale(),
      items: [{ id: "i1", saleId: "legacy", kind: "module", moduleId: "mod-1", moduleName: "Clínica médica", startsAt: "2026-08-20", endsAt: "2027-08-20" }],
    } as SaleRecord;

    render(
      <MemoryRouter>
        <SaleDetailPreview sale={sale} readOnly />
      </MemoryRouter>,
    );

    expect(screen.getByText("Clínica médica")).toBeInTheDocument();
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
    render(
      <MemoryRouter>
        <SaleDetailPreview sale={sale} readOnly />
      </MemoryRouter>,
    );
    expect(screen.getByText("Clínica médica")).toBeInTheDocument();
  });
});
