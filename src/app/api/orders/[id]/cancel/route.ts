import { readUuid } from "@/lib/api/query";
import { assertSameOrigin } from "@/lib/api/origin";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { requireIdempotencyKey } from "@/lib/api/request";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { cancelUserOrder } from "@/lib/orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const { user } = await requireApiUser();
    const { id } = await context.params;
    const orderId = readUuid(id, "ID pesanan");
    const idempotencyKey = requireIdempotencyKey(request);
    await enforceRateLimit(`orders:cancel:${user.id}:${orderId}`, 8, 60);
    const result = await cancelUserOrder(user.id, orderId, idempotencyKey);
    return apiSuccess(result);
  });
}
