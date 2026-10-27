import { NextResponse } from "next/server";
import { sanitizeNextPath } from "@/lib/auth/validation";
import { getTrustedAppOrigin } from "@/lib/api/origin";
import { hasPublicSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = getTrustedAppOrigin(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNextPath(url.searchParams.get("next"));

  if (!hasPublicSupabaseConfig()) {
    return NextResponse.redirect(new URL("/konfigurasi", origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=invalid-callback", origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=verification-failed", origin));
  }
  return NextResponse.redirect(new URL(next, origin));
}
