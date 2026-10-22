import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleRecord } from "@/services/commercialApi";
import { getHotmartCheckoutLink } from "@/services/paymentLinksApi";
import HotmartCheckoutLinkCard from "./HotmartCheckoutLink";

vi.mock("@/services/paymentLinksApi", () => ({
  getHotmartCheckoutLink: vi.fn(),
}));

vi.mock("@/services/whatsappApi", () => ({
  listWhatsappTemplates: vi.fn().mockResolvedValue([]),
  sendPaymentLinkWhatsapp: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const PRODUCT_URL = "https://pay.hotmart.com/FIXED";
const SALE_URL = "https://pay.hotmart.com/SALE?xcod=sale_1&sck=abc";
const writeText = vi.fn().mockResolvedValue(undefined);

function makeSale(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "sale_1",
    sellerId: "seller_1",
    currency: "BRL",
    status: "PENDING",
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    clients: [],
    items: [{
      id: "item_1",
      saleId: "sale_1",
      productId: "prod_1",
      releaseDate: "2026-10-01",
      createdAt: "2026-10-01T12:00:00.000Z",
      updatedAt: "2026-10-01T12:00:00.000Z",
      product: {
        id: "prod_1",
        name: "Programa",
        hotmartCheckoutUrl: PRODUCT_URL,
      },
    }],
    payments: [{
      id: "pay_hotmart",
      saleId: "sale_1",
      type: "FULL_PAYMENT",
      gateway: "HOTMART",
      amount: 800,
      status: "PENDING",
      createdAt: "2026-10-01T12:00:00.000Z",
      updatedAt: "2026-10-01T12:00:00.000Z",
    }],
    commissions: [],
    ...overrides,
  };
}

function renderCard(sale: SaleRecord) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <HotmartCheckoutLinkCard sale={sale} />
    </QueryClientProvider>,
  );
}

describe("HotmartCheckoutLinkCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("shows the per-sale link instead of the product checkout url", async () => {
    vi.mocked(getHotmartCheckoutLink).mockResolvedValue({ url: SALE_URL });
    renderCard(makeSale());

    expect(await screen.findByText(SALE_URL)).toBeInTheDocument();
    expect(screen.queryByText(PRODUCT_URL)).not.toBeInTheDocument();
    expect(getHotmartCheckoutLink).toHaveBeenCalledWith("sale_1");

    fireEvent.click(screen.getByRole("button", { name: "Copiar link Hotmart" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(SALE_URL);
    });
  });

  it("does not fall back to the fixed product url when the sale link fails", async () => {
    vi.mocked(getHotmartCheckoutLink).mockRejectedValue(new Error("Checkout Hotmart não configurado."));
    renderCard(makeSale());

    expect(await screen.findByRole("alert")).toHaveTextContent("Checkout Hotmart não configurado.");
    expect(screen.queryByText(PRODUCT_URL)).not.toBeInTheDocument();
  });

  it("stays hidden when the sale has no Hotmart checkout", () => {
    const { container } = renderCard(makeSale({
      items: [],
      payments: [],
      hotmartCheckoutLink: null,
    }));

    expect(container).toBeEmptyDOMElement();
    expect(getHotmartCheckoutLink).not.toHaveBeenCalled();
  });
});
