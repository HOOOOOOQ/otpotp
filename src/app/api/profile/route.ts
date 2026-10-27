import { assertSameOrigin } from "@/lib/api/origin";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/request";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { ensureProfile, requireApiUser } from "@/lib/auth/session";
import { profileSchema } from "@/lib/auth/validation";
import { updateProfileName } from "@/lib/db/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const { user } = await requireApiUser();
    await enforceRateLimit(`profile:update:${user.id}`, 10, 60);
    const body = await parseJsonBody(request, profileSchema);
    await updateProfileName(user.id, body.fullName);
    const profile = await ensureProfile({ ...user, fullName: body.fullName });
    return apiSuccess({ profile, message: "Profil berhasil diperbarui." });
  });
}
