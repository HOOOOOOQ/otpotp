import { enforceRateLimit } from "@/lib/api/rate-limit";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { requireAdminApiUser } from "@/lib/auth/session";
import { listDepositRequestsForAdmin } from "@/lib/db/wallet";
import { toDepositRequestView } from "@/lib/orders/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return apiRoute(async () => {
    const { user } = await requireAdminApiUser();
    await enforceRateLimit(`admin:deposits:list:${user.id}`, 60, 60);
    const rows = await listDepositRequestsForAdmin();
    return apiSuccess({ requests: rows.map(toDepositRequestView) }, 200, {
      "Cache-Control": "no-store",
    });
  });
}
