import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { clearSession, setSession } from "@/lib/session";

const SUCCESS_MESSAGE = "Pagamento recebido! A confirmação chega em instantes.";
const CANCEL_TITLE = "Pagamento não concluído";
const CANCEL_GUIDANCE =
  "Nenhuma cobrança foi feita. Para tentar de novo, abra novamente o link de pagamento que você recebeu ou fale com seu consultor.";
const SESSION_ID = "cs_test_a1b2c3d4e5f6g7h8";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

describe("public Stripe checkout return pages", () => {
  afterEach(() => {
    clearSession();
    window.history.pushState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("renders the success message without auth, a login redirect, or the raw session id", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network disabled"));

    renderAt(`/sales/payment/success?session_id=${SESSION_ID}`);

    expect(screen.getByRole("heading", { name: SUCCESS_MESSAGE })).toBeInTheDocument();
    expect(screen.getByText("Portal Revalida")).toBeInTheDocument();
    expect(screen.getByText(`••••${SESSION_ID.slice(-4)}`)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(SESSION_ID);
    expect(window.location.pathname).toBe("/sales/payment/success");
    expect(screen.queryByRole("button", { name: "Acessar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bem-vindo!" })).not.toBeInTheDocument();
    expect(screen.queryByText("Sair")).not.toBeInTheDocument();
    expect(screen.queryByText("Nova Venda")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders success after the hosting trailing-slash redirect and still ignores the session id", () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network disabled"));

    renderAt(`/sales/payment/success/?session_id=${SESSION_ID}`);

    expect(screen.getByRole("heading", { name: SUCCESS_MESSAGE })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(SESSION_ID);
    expect(window.location.pathname).toBe("/sales/payment/success/");
    expect(screen.queryByRole("button", { name: "Acessar" })).not.toBeInTheDocument();
  });

  it("renders success with no session id and no reference", () => {
    renderAt("/sales/payment/success");

    expect(screen.getByRole("heading", { name: SUCCESS_MESSAGE })).toBeInTheDocument();
    expect(screen.queryByText(/Referência/)).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/sales/payment/success");
  });

  it("hides an unsubstituted checkout session placeholder", () => {
    renderAt("/sales/payment/success?session_id=%7BCHECKOUT_SESSION_ID%7D");

    expect(screen.getByRole("heading", { name: SUCCESS_MESSAGE })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("CHECKOUT_SESSION_ID");
    expect(screen.queryByText(/Referência/)).not.toBeInTheDocument();
  });

  it("renders the cancel guidance without auth or the admin shell", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network disabled"));

    renderAt("/sales/payment/cancel");

    expect(screen.getByRole("heading", { name: CANCEL_TITLE })).toBeInTheDocument();
    expect(screen.getByText(CANCEL_GUIDANCE)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/sales/payment/cancel");
    expect(screen.queryByRole("button", { name: "Acessar" })).not.toBeInTheDocument();
    expect(screen.queryByText("Sair")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps the cancel page public when a comercial session exists", () => {
    setSession({ accessToken: "buyer-must-not-use-this" });

    renderAt("/sales/payment/cancel/");

    expect(screen.getByRole("heading", { name: CANCEL_TITLE })).toBeInTheDocument();
    expect(screen.getByText(CANCEL_GUIDANCE)).toBeInTheDocument();
    expect(screen.queryByText("Sair")).not.toBeInTheDocument();
    expect(screen.queryByText("Nova Venda")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("buyer-must-not-use-this");
  });

  it("still sends an unauthenticated visit to a protected route back to login", () => {
    renderAt("/dashboard");

    expect(screen.getByRole("heading", { name: "Bem-vindo!" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acessar" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
  });
});
