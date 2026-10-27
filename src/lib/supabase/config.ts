export interface PublicSupabaseConfig {
  url: string;
  anonKey: string;
}

export function hasPublicSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function hasServerSupabaseConfig(): boolean {
  return hasPublicSupabaseConfig() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function hasProviderConfig(): boolean {
  return Boolean(process.env.JASAOTP_API_KEY?.trim());
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error("Konfigurasi Supabase publik belum lengkap.");
  }
  return { url, anonKey };
}

export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.");
  return key;
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getConfigStatus() {
  return {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    providerApiKey: Boolean(process.env.JASAOTP_API_KEY?.trim()),
    adminEmails: Boolean(process.env.ADMIN_EMAILS?.trim()),
    cronSecret: Boolean(process.env.CRON_SECRET?.trim()),
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
    depositInstructions: Boolean(process.env.NEXT_PUBLIC_DEPOSIT_INSTRUCTIONS?.trim()),
  };
}
