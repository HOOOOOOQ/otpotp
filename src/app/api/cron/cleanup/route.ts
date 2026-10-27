import { AppError } from "@/lib/api/errors";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { callRpc } from "@/lib/db/rpc";
import { safeCompare } from "@/lib/security/hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiRoute(async () => {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) {
      throw new AppError("CRON_NOT_CONFIGURED", "CRON_SECRET belum dikonfigurasi.", 503);
    }
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!safeCompare(token, secret)) {
      throw new AppError("UNAUTHORIZED", "Akses cron ditolak.", 401);
    }
    const result = await callRpc("cleanup_sensitive_data");
    return apiSuccess({ result, time: new Date().toISOString() });
  });
}
