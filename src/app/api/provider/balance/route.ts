import { enforceRateLimit } from "@/lib/api/rate-limit";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { requireAdminApiUser } from "@/lib/auth/session";
import { getProviderBalance } from "@/lib/provider/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return apiRoute(async () => {
    const { user } = await requireAdminApiUser();
    await enforceRateLimit(`provider:balance:${user.id}`, 12, 60);
    const balance = await getProviderBalance();
    return apiSuccess({ balance }, 200, { "Cache-Control": "no-store" });
  });
}
