import { assertSameOrigin } from "@/lib/api/origin";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return apiSuccess({ redirectTo: "/", message: "Anda sudah keluar." });
  });
}
