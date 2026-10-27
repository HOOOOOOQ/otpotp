import type { Metadata } from "next";
import { ProviderBalanceClient } from "@/components/admin/provider-balance-client";
import { requirePageAdmin } from "@/lib/auth/page-guards";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Saldo Provider" };

export default async function ProviderBalancePage() {
  await requirePageAdmin("/dashboard/admin/saldo-provider");
  return <ProviderBalanceClient />;
}
