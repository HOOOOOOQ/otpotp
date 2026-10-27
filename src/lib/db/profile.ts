import "server-only";
import { mapDatabaseError } from "@/lib/db/errors";
import { getAdminClient } from "@/lib/supabase/admin";

export async function updateProfileName(userId: string, fullName: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId);
  if (error) throw mapDatabaseError(error);
}
