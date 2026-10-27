import "server-only";
import { AppError } from "@/lib/api/errors";
import { sha256 } from "@/lib/security/hash";
import { getAdminClient } from "@/lib/supabase/admin";
import { hasServerSupabaseConfig } from "@/lib/supabase/config";

interface LocalEntry {
  count: number;
  resetAt: number;
}

const localBuckets = new Map<string, LocalEntry>();

function consumeLocal(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const entry = localBuckets.get(key);
  if (!entry || entry.resetAt <= now) {
    localBuckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfter: 0 };
  }
  entry.count += 1;
  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  if (entry.count > limit) return { allowed: false, retryAfter };
  return { allowed: true, retryAfter: 0 };
}

function reject(retryAfter: number): never {
  throw new AppError(
    "RATE_LIMITED",
    "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
    429,
    { retryAfter: retryAfter || 30 },
  );
}

/**
 * Primary limiter is an atomic PostgreSQL function (works across Vercel instances).
 * A small in-process limiter is also enforced as a best-effort fallback when SQL is unavailable.
 */
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const hashedKey = sha256(key);
  const local = consumeLocal(hashedKey, limit, windowSeconds);
  if (!local.allowed) reject(local.retryAfter);

  if (!hasServerSupabaseConfig()) return;
  try {
    const { data, error } = await getAdminClient().rpc("consume_rate_limit", {
      p_key: hashedKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error || !data || typeof data !== "object") return;
    const result = data as { allowed?: boolean; retry_after?: number };
    if (result.allowed === false) reject(Number(result.retry_after) || 30);
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Do not fail the request solely because the optional distributed limiter is unavailable.
    console.warn("[kaii-otp:rate-limit] falling back to local limiter");
  }
}
