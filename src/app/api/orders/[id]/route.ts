import { readUuid } from "@/lib/api/query";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { getOrderDetail } from "@/lib/orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const { user } = await requireApiUser();
    const { id } = await context.params;
    const orderId = readUuid(id, "ID pesanan");
    await enforceRateLimit(`orders:detail:${user.id}:${orderId}`, 60, 60);
    const order = await getOrderDetail(user.id, orderId);
    return apiSuccess({ order });
  });
}
