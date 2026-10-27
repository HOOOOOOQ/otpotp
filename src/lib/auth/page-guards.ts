import "server-only";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/api/errors";
import { ensureProfile, getSessionUser, profileIsAdmin } from "@/lib/auth/session";
import { hasServerSupabaseConfig } from "@/lib/supabase/config";
import type { ProfileView } from "@/lib/types";

export async function requirePageUser(nextPath: string): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
  profile: ProfileView;
}> {
  if (!hasServerSupabaseConfig()) {
    redirect(`/konfigurasi?from=${encodeURIComponent(nextPath)}`);
  }
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  const profile = await ensureProfile(user);
  return { user, profile };
}

export async function requirePageAdmin(nextPath: string) {
  const result = await requirePageUser(nextPath);
  if (!profileIsAdmin(result.profile, result.user)) {
    redirect("/dashboard?error=admin-only");
  }
  return result;
}

export function assertAdmin(profile: ProfileView, email: string) {
  if (!profileIsAdmin(profile, { id: profile.id, email, fullName: profile.fullName })) {
    throw new AppError("FORBIDDEN", "Halaman ini hanya untuk administrator.", 403);
  }
}
