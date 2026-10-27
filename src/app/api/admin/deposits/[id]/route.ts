import { assertSameOrigin } from "@/lib/api/origin";
import { readUuid } from "@/lib/api/query";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/request";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { requireAdminApiUser } from "@/lib/auth/session";
import { depositDecisionSchema } from "@/lib/auth/validation";
import { approveDeposit, rejectDeposit } from "@/lib/db/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const { user } = await requireAdminApiUser();
    const { id } = await context.params;
    const requestId = readUuid(id, "ID deposit");
    await enforceRateLimit(`admin:deposits:decision:${user.id}`, 60, 60);
    const body = await parseJsonBody(request, depositDecisionSchema);
    const outcome =
      body.action === "approve"
        ? await approveDeposit({ requestId, adminId: user.id, adminNote: body.adminNote })
        : await rejectDeposit({ requestId, adminId: user.id, adminNote: body.adminNote });
    return apiSuccess({
      outcome,
      message:
        body.action === "approve"
          ? "Permintaan deposit diproses. Saldo hanya ditambahkan sekali oleh fungsi atomik."
          : "Permintaan deposit ditolak.",
    });
  });
}
