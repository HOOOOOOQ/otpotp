import type { Metadata } from "next";
import { AdminMessagesClient } from "@/components/admin/admin-messages-client";
import { requirePageAdmin } from "@/lib/auth/page-guards";
import { listSupportMessages } from "@/lib/db/support";
import { toSupportMessageView } from "@/lib/orders/mapper";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pesan Masuk" };

export default async function AdminMessagesPage() {
  await requirePageAdmin("/dashboard/admin/pesan");
  const rows = await listSupportMessages();
  return <AdminMessagesClient initialMessages={rows.map(toSupportMessageView)} />;
}
