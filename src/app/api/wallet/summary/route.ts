import { enforceRateLimit } from "@/lib/api/rate-limit";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return apiRoute(async () => {
    const { user, profile } = await requireApiUser();
    await enforceRateLimit(`wallet:summary:${user.id}`, 60, 60);
    return apiSuccess({ profile }, 200, { "Cache-Control": "no-store" });
  });
}
