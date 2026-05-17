import { getSession } from "@/lib/session";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

function withSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function buildUrl(baseUrl: string, path: string): string {
  const normalizedBase = withSlash(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export async function apiRequest<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
  if (!baseUrl) {
    throw new Error("Base URL da API nao configurada.");
  }

  const session = getSession();
  const response = await fetch(buildUrl(baseUrl, path), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

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
