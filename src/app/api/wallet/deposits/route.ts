import { assertSameOrigin } from "@/lib/api/origin";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/request";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { depositSchema } from "@/lib/auth/validation";
import {
  createDepositRequest,
  listDepositRequestsForUser,
} from "@/lib/db/wallet";
import { toDepositRequestView } from "@/lib/orders/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return apiRoute(async () => {
    const { user } = await requireApiUser();
    await enforceRateLimit(`wallet:deposits:list:${user.id}`, 40, 60);
    const rows = await listDepositRequestsForUser(user.id);
    return apiSuccess({ requests: rows.map(toDepositRequestView) });
  });
}

export async function POST(request: Request) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const { user } = await requireApiUser();
    await enforceRateLimit(`wallet:deposits:create:${user.id}`, 8, 3600);
    const body = await parseJsonBody(request, depositSchema);
    const row = await createDepositRequest({
      userId: user.id,
      amountIdr: body.amountIdr,
      paymentReference: body.paymentReference,
      note: body.note,
    });
    return apiSuccess(
      {
        request: toDepositRequestView(row),
        message: "Permintaan deposit tercatat. Saldo baru masuk setelah admin memverifikasi pembayaran.",
      },
      201,
    );
  });
}
