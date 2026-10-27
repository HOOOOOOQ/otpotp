import { enforceRateLimit } from "@/lib/api/rate-limit";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/db/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return apiRoute(async () => {
    const { user, profile } = await requireApiUser();
    await enforceRateLimit(`dashboard:summary:${user.id}`, 40, 60);
    const summary = await getDashboardSummary(profile);
    return apiSuccess(summary, 200, { "Cache-Control": "no-store" });
  });
}
