import "server-only";
import type { User } from "@supabase/supabase-js";
import { AppError } from "@/lib/api/errors";
import { getAdminClient } from "@/lib/supabase/admin";
import { getAdminEmails, hasPublicSupabaseConfig, hasServerSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileView } from "@/lib/types";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
}

function toSessionUser(user: User): SessionUser {
  const metadataName = user.user_metadata?.full_name;
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: typeof metadataName === "string" ? metadataName : null,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!hasPublicSupabaseConfig()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return toSessionUser(data.user);
  } catch {
    return null;
  }
}

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "user" | "admin";
  balance_idr: number | string;
  created_at: string;
};

export function mapProfile(row: ProfileRow): ProfileView {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    balanceIdr: Number(row.balance_idr),
    createdAt: row.created_at,
  };
}

/** Creates the profile only if the database trigger did not already do so. Never changes balance/role. */
export async function ensureProfile(user: SessionUser): Promise<ProfileView> {
  if (!hasServerSupabaseConfig()) {
    throw new AppError(
      "SERVER_CONFIG_INCOMPLETE",
      "Konfigurasi server belum lengkap. Buka halaman konfigurasi.",
      503,
    );
  }
  const admin = getAdminClient();
  const { data: existing, error: readError } = await admin
    .from("profiles")
    .select("id,email,full_name,role,balance_idr,created_at")
    .eq("id", user.id)
    .maybeSingle();
  if (readError) {
    throw new AppError("DATABASE_NOT_READY", "Skema database belum siap. Jalankan migrasi SQL.", 503);
  }
  if (existing) return mapProfile(existing as ProfileRow);

  const { data: created, error: insertError } = await admin
    .from("profiles")
    .upsert(
      { id: user.id, email: user.email, full_name: user.fullName },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id,email,full_name,role,balance_idr,created_at")
    .maybeSingle();
  if (insertError) {
    throw new AppError("DATABASE_NOT_READY", "Profil tidak dapat disiapkan. Jalankan migrasi SQL.", 503);
  }
  if (created) return mapProfile(created as ProfileRow);

  const { data: retried } = await admin
    .from("profiles")
    .select("id,email,full_name,role,balance_idr,created_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!retried) {
    throw new AppError("PROFILE_NOT_FOUND", "Profil pengguna tidak ditemukan.", 404);
  }
  return mapProfile(retried as ProfileRow);
}

export async function requireApiUser(): Promise<{ user: SessionUser; profile: ProfileView }> {
  if (!hasServerSupabaseConfig()) {
    throw new AppError(
      "SERVER_CONFIG_INCOMPLETE",
      "Konfigurasi server belum lengkap. Buka halaman konfigurasi.",
      503,
    );
  }
  const user = await getSessionUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Sesi berakhir. Silakan masuk kembali.", 401);
  const profile = await ensureProfile(user);
  return { user, profile };
}

export function profileIsAdmin(profile: ProfileView, user: SessionUser): boolean {
  if (profile.role !== "admin") return false;
  const allowed = getAdminEmails();
  if (allowed.length === 0) return true;
  return allowed.includes(user.email.toLowerCase());
}

export async function requireAdminApiUser(): Promise<{ user: SessionUser; profile: ProfileView }> {
  const result = await requireApiUser();
  if (!profileIsAdmin(result.profile, result.user)) {
    throw new AppError("FORBIDDEN", "Halaman ini hanya untuk administrator.", 403);
  }
  return result;
}
