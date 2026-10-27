import { AppError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { getClientIp, parseJsonBody } from "@/lib/api/request";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { loginSchema, sanitizeNextPath } from "@/lib/auth/validation";
import { hasPublicSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    if (!hasPublicSupabaseConfig()) {
      throw new AppError("SERVER_CONFIG_INCOMPLETE", "Supabase belum dikonfigurasi.", 503);
    }
    const body = await parseJsonBody(request, loginSchema);
    await enforceRateLimit(`auth:login:${getClientIp(request)}:${body.email}`, 8, 900);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error || !data.user) {
      throw new AppError("INVALID_CREDENTIALS", "Email atau kata sandi tidak sesuai.", 401);
    }
    return apiSuccess({
      redirectTo: sanitizeNextPath(body.next),
      message: "Berhasil masuk. Mengalihkan ke dashboard.",
    });
  });
}
