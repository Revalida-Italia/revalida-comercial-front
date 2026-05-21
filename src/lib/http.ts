import { toast } from "sonner";
import { clearSession, getSession, setAuthNotice, setSession, type AuthSession } from "@/lib/session";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

interface RefreshResponse {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
}

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL as string;
const SESSION_EXPIRED_MESSAGE = "Sessao encerrada. Faca login novamente.";

function withSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function buildUrl(baseUrl: string, path: string): string {
  const normalizedBase = withSlash(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function buildHeaders(
  accessToken?: string,
  extraHeaders?: Record<string, string>,
  hasBody?: boolean,
): Record<string, string> {
  return {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(extraHeaders ?? {}),
  };
}

async function refreshAuthSession(refreshToken: string): Promise<AuthSession | null> {
  if (!AUTH_API_URL) {
    return null;
  }

  const refreshResponse = await fetch(buildUrl(AUTH_API_URL, "/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!refreshResponse.ok) {
    return null;
  }

  const payload = (await refreshResponse.json()) as RefreshResponse;
  const accessToken = payload.accessToken ?? payload.token;

  if (!accessToken) {
    return null;
  }

  const nextSession: AuthSession = {
    accessToken,
    refreshToken: payload.refreshToken ?? refreshToken,
  };

  setSession(nextSession);
  return nextSession;
}

function handleExpiredSession(): never {
  clearSession();
  setAuthNotice(SESSION_EXPIRED_MESSAGE);

  toast.error(SESSION_EXPIRED_MESSAGE);

  if (window.location.pathname !== "/login") {
    window.location.assign("/login?reason=session-expired");
  }

  throw new Error(SESSION_EXPIRED_MESSAGE);
}

export async function apiRequest<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
  if (!baseUrl) {
    throw new Error("Base URL da API nao configurada.");
  }

  const session = getSession();
  const requestUrl = buildUrl(baseUrl, path);
  const hasBody = options.body !== undefined;

  const makeRequest = (accessToken?: string) => fetch(requestUrl, {
    method: options.method ?? "GET",
    headers: buildHeaders(accessToken, options.headers, hasBody),
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  let response = await makeRequest(session?.accessToken);

  if (response.status === 401 && session?.accessToken) {
    const refreshToken = session?.refreshToken;

    if (!refreshToken) {
      handleExpiredSession();
    }

    const refreshedSession = await refreshAuthSession(refreshToken);

    if (!refreshedSession) {
      handleExpiredSession();
    }

    response = await makeRequest(refreshedSession.accessToken);

    if (response.status === 401) {
      handleExpiredSession();
    }
  }

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;

    try {
      const payload = (await response.json()) as { message?: string };
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // Intentionally ignore payload parse errors and keep default message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
