import { enforceRateLimit } from "@/lib/api/rate-limit";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { requireAdminApiUser } from "@/lib/auth/session";
import { listSupportMessages } from "@/lib/db/support";
import { toSupportMessageView } from "@/lib/orders/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return apiRoute(async () => {
    const { user } = await requireAdminApiUser();
    await enforceRateLimit(`admin:support:list:${user.id}`, 60, 60);
    const rows = await listSupportMessages();
    return apiSuccess({ messages: rows.map(toSupportMessageView) }, 200, {
      "Cache-Control": "no-store",
    });
  });
}
