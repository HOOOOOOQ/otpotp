import "server-only";
import { mapDatabaseError } from "@/lib/db/errors";
import type { SupportMessageRow } from "@/lib/db/types";
import { getAdminClient } from "@/lib/supabase/admin";

export async function createSupportMessage(args: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const { error } = await getAdminClient().from("support_messages").insert({
    name: args.name,
    email: args.email,
    subject: args.subject,
    message: args.message,
    status: "open",
  });
  if (error) throw mapDatabaseError(error);
}

export async function listSupportMessages(): Promise<SupportMessageRow[]> {
  const { data, error } = await getAdminClient()
    .from("support_messages")
    .select("id,name,email,subject,message,status,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw mapDatabaseError(error);
  return (data as SupportMessageRow[] | null) ?? [];
}

export async function updateSupportMessageStatus(
  id: string,
  status: "open" | "resolved",
): Promise<void> {
  const { error } = await getAdminClient()
    .from("support_messages")
    .update({ status })
    .eq("id", id);
  if (error) throw mapDatabaseError(error);
}
