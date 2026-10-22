import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppSidebar from "@/components/AppSidebar";
import { RequireAdmin, RequireAuth } from "@/components/RouteGuards";
import { clearSession, setProfile, setSession, type UserProfile } from "@/lib/session";
import AdminPaymentWebhookEvents from "@/pages/AdminPaymentWebhookEvents";
import { PAYMENT_WEBHOOK_EVENTS_PATH } from "./constants";

vi.mock("@/services/authApi", () => ({
  resolveProfile: vi.fn(async () => null),
  updateProfileName: vi.fn(),
}));

vi.mock("@/services/paymentLinksApi", () => ({
  listPaymentWebhookEvents: vi.fn().mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  }),
  resolvePaymentWebhookEvent: vi.fn(),
}));

function profile(role: string): UserProfile {
  return {
    sub: "user_1",
    email: `${role.toLowerCase()}@example.com`,
    role,
    roles: [role],
  };
}

function renderSidebar(role: string) {
  setSession({ accessToken: "token" });
  setProfile(profile(role));
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppSidebar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderRoute(role: string) {
  setSession({ accessToken: "token" });
  setProfile(profile(role));
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[PAYMENT_WEBHOOK_EVENTS_PATH]}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route element={<RequireAdmin />}>
              <Route path={PAYMENT_WEBHOOK_EVENTS_PATH} element={<AdminPaymentWebhookEvents />} />
            </Route>
          </Route>
          <Route path="/dashboard" element={<p>Painel do vendedor</p>} />
          <Route path="/" element={<p>Login</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("payment webhook events admin access", () => {
  afterEach(() => {
    clearSession();
  });

  it("shows the nav item only to admins", () => {
    const { unmount } = renderSidebar("ADMIN");
    expect(screen.getByRole("button", { name: "Eventos de pagamento não conciliados" })).toBeInTheDocument();
    unmount();

    renderSidebar("SELLER");
    expect(screen.queryByRole("button", { name: "Eventos de pagamento não conciliados" })).not.toBeInTheDocument();
  });

  it("keeps the route behind the admin guard", async () => {
    const { unmount } = renderRoute("SELLER");
    expect(screen.getByText("Painel do vendedor")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Eventos de pagamento não conciliados" })).not.toBeInTheDocument();
    unmount();
    clearSession();

    renderRoute("ADMIN");
    expect(await screen.findByRole("heading", { name: "Eventos de pagamento não conciliados" })).toBeInTheDocument();
  });
});
