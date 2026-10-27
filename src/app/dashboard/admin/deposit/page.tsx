import type { Metadata } from "next";
import { AdminDepositsClient } from "@/components/admin/admin-deposits-client";
import { requirePageAdmin } from "@/lib/auth/page-guards";
import { listDepositRequestsForAdmin } from "@/lib/db/wallet";
import { toDepositRequestView } from "@/lib/orders/mapper";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verifikasi Deposit" };

export default async function AdminDepositsPage() {
  await requirePageAdmin("/dashboard/admin/deposit");
  const rows = await listDepositRequestsForAdmin();
  return <AdminDepositsClient initialRequests={rows.map(toDepositRequestView)} />;
}
