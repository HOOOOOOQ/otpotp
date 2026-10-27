import { createClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/request";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { passwordSchema } from "@/lib/auth/validation";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const { user } = await requireApiUser();
    const body = await parseJsonBody(request, passwordSchema);
    await enforceRateLimit(`auth:password:${user.id}`, 5, 900);

    const { url, anonKey } = getPublicSupabaseConfig();
    const verifier = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error: verifyError } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: body.currentPassword,
    });
    if (verifyError) {
      throw new AppError("INVALID_CREDENTIALS", "Kata sandi saat ini tidak sesuai.", 401);
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password: body.newPassword });
    if (error) {
      throw new AppError("PASSWORD_UPDATE_FAILED", "Kata sandi belum dapat diperbarui.", 400);
    }
    return apiSuccess({ message: "Kata sandi berhasil diperbarui." });
  });
}
