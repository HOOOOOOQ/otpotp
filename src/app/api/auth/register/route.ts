import { apiRoute, apiSuccess } from "@/lib/api/response";
import { assertSameOrigin, getTrustedAppOrigin } from "@/lib/api/origin";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { getClientIp, parseJsonBody } from "@/lib/api/request";
import { AppError } from "@/lib/api/errors";
import { registerSchema, sanitizeNextPath } from "@/lib/auth/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    if (!hasPublicSupabaseConfig()) {
      throw new AppError("SERVER_CONFIG_INCOMPLETE", "Supabase belum dikonfigurasi.", 503);
    }
    const body = await parseJsonBody(request, registerSchema);
    await enforceRateLimit(`auth:register:${getClientIp(request)}:${body.email}`, 5, 900);

    const supabase = await createSupabaseServerClient();
    const redirectTo = new URL("/auth/callback", getTrustedAppOrigin(request));
    redirectTo.searchParams.set("next", sanitizeNextPath(body.next));
    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: { full_name: body.fullName },
        emailRedirectTo: redirectTo.toString(),
      },
    });
    if (error) {
      throw new AppError(
        "REGISTER_FAILED",
        "Pendaftaran belum berhasil. Periksa data Anda atau coba lagi beberapa saat.",
        400,
      );
    }
    return apiSuccess(
      {
        requiresEmailConfirmation: !data.session,
        redirectTo: data.session ? sanitizeNextPath(body.next) : null,
        message: data.session
          ? "Akun berhasil dibuat. Anda sudah masuk."
          : "Akun berhasil dibuat. Periksa email Anda untuk verifikasi sebelum masuk.",
      },
      201,
    );
  });
}
