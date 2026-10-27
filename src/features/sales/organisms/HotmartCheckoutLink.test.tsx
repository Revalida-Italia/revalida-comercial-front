import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { HOTMART_FIXED_LIST_WARNING } from "@/features/sales/utils/hotmartCheckout";
import type { SaleRecord } from "@/services/commercialApi";
import {
  HOTMART_CHECKOUT_URL_NOT_CONFIGURED,
  HOTMART_PRODUCT_NOT_IN_FIXED_LIST,
  getHotmartCheckoutLink,
} from "@/services/paymentLinksApi";
import HotmartCheckoutLinkCard, { HotmartCheckoutLinkDialog } from "./HotmartCheckoutLink";
import SaleListCard from "./SaleListCard";

vi.mock("@/services/paymentLinksApi", async () => {
  const actual = await vi.importActual<typeof import("@/services/paymentLinksApi")>("@/services/paymentLinksApi");
  return {
    ...actual,
    getHotmartCheckoutLink: vi.fn(),
  };
});

vi.mock("@/services/whatsappApi", () => ({
  listWhatsappTemplates: vi.fn().mockResolvedValue([]),
  sendPaymentLinkWhatsapp: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const PRODUCT_URL = "https://pay.hotmart.com/FIXED";
const SALE_URL = "https://pay.hotmart.com/SALE?xcod=sale_1&sck=abc";
const STALE_URL = "https://pay.hotmart.com/STALE?xcod=sale_1";
const writeText = vi.fn().mockResolvedValue(undefined);
const WARNING = HOTMART_FIXED_LIST_WARNING;

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

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function codedError(code: string, status = 422): Error {
  const error = new Error(code) as Error & { code?: string; status?: number };
  error.code = code;
  error.status = status;
  return error;
}

describe("HotmartCheckoutLinkCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("shows the per-sale link instead of a product checkout url", async () => {
    vi.mocked(getHotmartCheckoutLink).mockResolvedValue({ url: SALE_URL });
    renderWithClient(<SaleListCard sale={makeSale()} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir link Hotmart desta venda" }));

    expect(await screen.findByText(SALE_URL)).toBeInTheDocument();
    expect(screen.queryByText(PRODUCT_URL)).not.toBeInTheDocument();
    expect(getHotmartCheckoutLink).toHaveBeenCalledWith("sale_1");

    fireEvent.click(screen.getByRole("button", { name: "Copiar link Hotmart" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(SALE_URL);
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows a warning when the product is outside the fixed list", async () => {
    vi.mocked(getHotmartCheckoutLink).mockResolvedValue({
      available: false,
      reason: HOTMART_PRODUCT_NOT_IN_FIXED_LIST,
    });
    renderWithClient(
      <HotmartCheckoutLinkDialog sale={makeSale({ hotmartCheckoutLink: STALE_URL })} open onOpenChange={() => undefined} />,
    );

    expect(await screen.findByRole("status")).toHaveTextContent(WARNING);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(STALE_URL)).not.toBeInTheDocument();
    expect(screen.queryByText(PRODUCT_URL)).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("shows the same warning when the request fails with a fixed-list code", async () => {
    vi.mocked(getHotmartCheckoutLink).mockRejectedValue(codedError(HOTMART_PRODUCT_NOT_IN_FIXED_LIST, 404));
    renderWithClient(<SaleListCard sale={makeSale({ hotmartCheckoutLink: STALE_URL })} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir link Hotmart desta venda" }));

    expect(await screen.findByRole("status")).toHaveTextContent(WARNING);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(STALE_URL)).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows the same warning for the legacy checkout-url code", async () => {
    vi.mocked(getHotmartCheckoutLink).mockRejectedValue(codedError(HOTMART_CHECKOUT_URL_NOT_CONFIGURED));
    renderWithClient(<SaleListCard sale={makeSale()} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir link Hotmart desta venda" }));

    expect(await screen.findByRole("status")).toHaveTextContent(WARNING);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("does not fall back to another url when the sale link fails", async () => {
    vi.mocked(getHotmartCheckoutLink).mockRejectedValue(new Error("Checkout Hotmart não configurado."));
    renderWithClient(<SaleListCard sale={makeSale()} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir link Hotmart desta venda" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Checkout Hotmart não configurado.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(PRODUCT_URL)).not.toBeInTheDocument();
  });

  it("stays hidden when the sale has no Hotmart checkout", () => {
    const sale = makeSale({
      payments: [],
      hotmartCheckoutLink: null,
    });
    const product = sale.items?.[0]?.product as { hotmartCheckoutUrl?: string } | undefined;
    if (product) {
      product.hotmartCheckoutUrl = PRODUCT_URL;
    }

    const card = renderWithClient(<HotmartCheckoutLinkCard sale={sale} />);
    expect(card.container).toBeEmptyDOMElement();

    renderWithClient(<SaleListCard sale={sale} />);
    expect(screen.queryByRole("button", { name: "Abrir link Hotmart desta venda" })).not.toBeInTheDocument();
    expect(getHotmartCheckoutLink).not.toHaveBeenCalled();
  });
});
