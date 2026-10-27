import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getPublicSupabaseConfig,
  hasPublicSupabaseConfig,
  hasServerSupabaseConfig,
} from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
  if (!hasPublicSupabaseConfig() || !hasServerSupabaseConfig()) {
    const url = request.nextUrl.clone();
    url.pathname = "/konfigurasi";
    url.search = `?from=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });
  const { url, anonKey } = getPublicSupabaseConfig();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getUser() validates the JWT with Supabase Auth instead of trusting unchecked cookie claims.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(`${request.nextUrl.pathname}${request.nextUrl.search}`)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
