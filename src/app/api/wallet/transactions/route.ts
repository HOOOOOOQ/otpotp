import { enforceRateLimit } from "@/lib/api/rate-limit";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { listTransactionRows } from "@/lib/db/orders";
import { toTransactionView } from "@/lib/orders/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return apiRoute(async () => {
    const { user } = await requireApiUser();
    await enforceRateLimit(`wallet:transactions:${user.id}`, 40, 60);
    const rows = await listTransactionRows(user.id);
    return apiSuccess({ transactions: rows.map(toTransactionView) }, 200, {
      "Cache-Control": "no-store",
    });
  });
}
