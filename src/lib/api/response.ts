import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, ValidationError } from "@/lib/api/errors";
import { ProviderError } from "@/lib/provider/types";

export function apiSuccess<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json({ success: true, data }, { status, headers });
}

function providerErrorToAppError(error: ProviderError): AppError {
  switch (error.kind) {
    case "config":
      return new AppError("PROVIDER_NOT_CONFIGURED", error.message, 503);
    case "business":
      return new AppError("PROVIDER_REJECTED", error.message, 409);
    case "transport":
      return new AppError("PROVIDER_UNREACHABLE", error.message, 504);
    case "rate_limited":
      return new AppError("PROVIDER_RATE_LIMITED", error.message, 429, { retryAfter: 30 });
    case "invalid_response":
    default:
      return new AppError("PROVIDER_INVALID_RESPONSE", error.message, 502);
  }
}

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof ProviderError) return providerErrorToAppError(error);
  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "form";
      details[key] = [...(details[key] ?? []), issue.message];
    }
    return new ValidationError(details);
  }
  if (error instanceof SyntaxError) {
    return new AppError("INVALID_JSON", "Format permintaan tidak valid.", 400);
  }
  return new AppError("INTERNAL_ERROR", "Terjadi kendala pada server. Coba lagi beberapa saat.", 500);
}

export function apiFailure(error: unknown) {
  const appError = normalizeError(error);
  if (appError.status >= 500) {
    // Operational logging only: never log raw provider bodies, API keys, passwords, or OTP codes.
    console.error("[kaii-otp:api]", {
      code: appError.code,
      status: appError.status,
      kind: error instanceof ProviderError ? error.kind : error?.constructor?.name ?? "unknown",
    });
  }
  const headers: HeadersInit = {};
  if (appError.retryAfter) headers["Retry-After"] = String(appError.retryAfter);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details ? { details: appError.details } : {}),
      },
    },
    { status: appError.status, headers },
  );
}

export async function apiRoute(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    return apiFailure(error);
  }
}
