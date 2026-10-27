import { assertSameOrigin } from "@/lib/api/origin";
import { readUuid } from "@/lib/api/query";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/request";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { requireAdminApiUser } from "@/lib/auth/session";
import { supportDecisionSchema } from "@/lib/auth/validation";
import { updateSupportMessageStatus } from "@/lib/db/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const { user } = await requireAdminApiUser();
    const { id } = await context.params;
    const messageId = readUuid(id, "ID pesan");
    await enforceRateLimit(`admin:support:update:${user.id}`, 60, 60);
    const body = await parseJsonBody(request, supportDecisionSchema);
    await updateSupportMessageStatus(messageId, body.status);
    return apiSuccess({ status: body.status, message: "Status pesan diperbarui." });
  });
}
