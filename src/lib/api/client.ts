import type { ApiEnvelope } from "@/lib/types";

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, string[]>;

  constructor(code: string, message: string, status: number, details?: Record<string, string[]>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError("NETWORK_ERROR", "Tidak dapat terhubung ke server. Periksa koneksi Anda.", 0);
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiClientError(
      "INVALID_RESPONSE",
      "Respons server tidak dapat dibaca. Coba lagi.",
      response.status,
    );
  }

  if (!response.ok || !payload?.success || payload.data === undefined) {
    const error = payload?.error;
    throw new ApiClientError(
      error?.code ?? "REQUEST_FAILED",
      error?.message ?? "Permintaan gagal. Coba lagi.",
      response.status,
      error?.details,
    );
  }
  return payload.data;
}

export function apiGet<T>(url: string, init: RequestInit = {}): Promise<T> {
  return apiFetch<T>(url, { ...init, method: "GET" });
}

export function apiPost<T>(url: string, body?: unknown, headers?: HeadersInit): Promise<T> {
  return apiFetch<T>(url, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers,
  });
}

export function apiPatch<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, { method: "PATCH", body: JSON.stringify(body) });
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `key-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function friendlyApiError(error: unknown, fallback = "Permintaan gagal. Coba lagi."): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
