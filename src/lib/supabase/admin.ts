import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/api/errors";
import {
  getPublicSupabaseConfig,
  getServiceRoleKey,
  hasServerSupabaseConfig,
} from "@/lib/supabase/config";

let cachedClient: SupabaseClient | null = null;

/** Service-role client for trusted server code only. Never import this from a Client Component. */
export function getAdminClient(): SupabaseClient {
  if (!hasServerSupabaseConfig()) {
    throw new AppError(
      "SERVER_CONFIG_INCOMPLETE",
      "Konfigurasi server belum lengkap. Periksa Supabase dan kredensial penyedia.",
      503,
    );
  }
  if (!cachedClient) {
    const { url } = getPublicSupabaseConfig();
    cachedClient = createClient(url, getServiceRoleKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "kaii-otp-server" },
      },
    });
  }
  return cachedClient;
}
