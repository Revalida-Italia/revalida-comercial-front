import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { HOTMART_FIXED_LIST_WARNING } from "@/features/sales/utils/hotmartCheckout";
import type { SaleRecord } from "@/services/commercialApi";
import { getHotmartCheckoutLink } from "@/services/paymentLinksApi";
import HotmartCheckoutLinkCard from "./HotmartCheckoutLink";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const BACK_MESSAGE = "Este produto não está na lista fixa de links Hotmart.";

const HOTMART_NOT_IN_LIST_BODY = {
  success: false,
  available: false,
  code: "HOTMART_PRODUCT_NOT_IN_FIXED_LIST",
  error: "HOTMART_PRODUCT_NOT_IN_FIXED_LIST",
  reason: "HOTMART_PRODUCT_NOT_IN_FIXED_LIST",
  message: BACK_MESSAGE,
};

const LEGACY_NOT_CONFIGURED_BODY = {
  success: false,
  available: false,
  error: "HOTMART_CHECKOUT_URL_NOT_CONFIGURED",
  reason: "HOTMART_CHECKOUT_URL_NOT_CONFIGURED",
  message: "Checkout Hotmart não configurado.",
};

function sale(): SaleRecord {
  return {
    id: "sale_1",
    sellerId: "seller_1",
    currency: "BRL",
    status: "PENDING",
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    clients: [],
    items: [],
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
    hotmartCheckoutLink: "https://pay.hotmart.com/STALE?xcod=sale_1",
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

function renderCard() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        retryDelay: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <HotmartCheckoutLinkCard sale={sale()} />
    </QueryClientProvider>,
  );
}

describe("Hotmart fixed-list 400 through http", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it.each([
    ["with code", HOTMART_NOT_IN_LIST_BODY],
    ["without code", (() => {
      const { code, ...body } = HOTMART_NOT_IN_LIST_BODY;
      expect(code).toBe("HOTMART_PRODUCT_NOT_IN_FIXED_LIST");
      return body;
    })()],
  ])("shows the warning on the first response %s and does not retry", async (_label, body) => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(body)));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getHotmartCheckoutLink("sale_1")).resolves.toEqual({
      available: false,
      reason: "HOTMART_PRODUCT_NOT_IN_FIXED_LIST",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();
    renderCard();

    expect(await screen.findByRole("status")).toHaveTextContent(HOTMART_FIXED_LIST_WARNING);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(BACK_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText("https://pay.hotmart.com/STALE?xcod=sale_1")).not.toBeInTheDocument();
    expect(screen.queryByText("Carregando link Hotmart...")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://core.test/sales/sale_1/hotmart-checkout-link",
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("does not retry HOTMART_CHECKOUT_URL_NOT_CONFIGURED when code is omitted", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(LEGACY_NOT_CONFIGURED_BODY)));
    vi.stubGlobal("fetch", fetchMock);

    renderCard();

    expect(await screen.findByRole("status")).toHaveTextContent(HOTMART_FIXED_LIST_WARNING);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(LEGACY_NOT_CONFIGURED_BODY.message)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
