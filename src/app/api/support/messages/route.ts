import { assertSameOrigin } from "@/lib/api/origin";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { getClientIp, parseJsonBody } from "@/lib/api/request";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { contactSchema } from "@/lib/auth/validation";
import { createSupportMessage } from "@/lib/db/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    await enforceRateLimit(`support:create:${getClientIp(request)}`, 4, 3600);
    const body = await parseJsonBody(request, contactSchema);
    await createSupportMessage(body);
    return apiSuccess(
      { message: "Pesan terkirim. Tim administrator akan meninjaunya dari dashboard." },
      201,
    );
  });
}
