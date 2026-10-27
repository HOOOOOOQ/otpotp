import { readLimit, readOrderStatus } from "@/lib/api/query";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody, requireIdempotencyKey } from "@/lib/api/request";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { assertSameOrigin } from "@/lib/api/origin";
import { requireApiUser } from "@/lib/auth/session";
import { orderSchema } from "@/lib/auth/validation";
import { listOrders, purchaseOrder } from "@/lib/orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiRoute(async () => {
    const { user } = await requireApiUser();
    await enforceRateLimit(`orders:list:${user.id}`, 60, 60);
    const orders = await listOrders(user.id, {
      limit: readLimit(request),
      status: readOrderStatus(request),
    });
    return apiSuccess({ orders });
  });
}

export async function POST(request: Request) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const { user } = await requireApiUser();
    const idempotencyKey = requireIdempotencyKey(request);
    await enforceRateLimit(`orders:create:${user.id}`, 10, 60);
    const body = await parseJsonBody(request, orderSchema);
    const result = await purchaseOrder(
      user.id,
      {
        countryId: body.negara,
        serviceCode: body.layanan,
        operator: body.operator,
      },
      idempotencyKey,
    );
    return apiSuccess(result, result.duplicate ? 200 : 201);
  });
}
