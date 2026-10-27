import { AppError } from "@/lib/api/errors";
import { safeIdempotencyKey } from "@/lib/auth/validation";
import type { z } from "zod";

export async function parseJsonBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 16_384) {
    throw new AppError("PAYLOAD_TOO_LARGE", "Ukuran permintaan terlalu besar.", 413);
  }
  const raw = await request.text();
  if (raw.length > 16_384) {
    throw new AppError("PAYLOAD_TOO_LARGE", "Ukuran permintaan terlalu besar.", 413);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new AppError("INVALID_JSON", "Format permintaan tidak valid.", 400);
  }
  return schema.parse(json);
}

export function requireIdempotencyKey(request: Request): string {
  const key = safeIdempotencyKey(request.headers.get("idempotency-key"));
  if (!key) {
    throw new AppError(
      "IDEMPOTENCY_KEY_REQUIRED",
      "Kunci idempotensi tidak valid. Muat ulang halaman lalu coba lagi.",
      400,
    );
  }
  return key;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 80);
  return request.headers.get("x-real-ip")?.trim().slice(0, 80) ?? "unknown";
}
