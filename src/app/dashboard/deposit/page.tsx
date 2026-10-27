import type { Metadata } from "next";
import { DepositClient } from "@/components/wallet/deposit-client";
import { requirePageUser } from "@/lib/auth/page-guards";
import { listDepositRequestsForUser } from "@/lib/db/wallet";
import { toDepositRequestView } from "@/lib/orders/mapper";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Deposit Saldo" };

export default async function DepositPage() {
  const { profile } = await requirePageUser("/dashboard/deposit");
  const rows = await listDepositRequestsForUser(profile.id);
  const instructions = process.env.NEXT_PUBLIC_DEPOSIT_INSTRUCTIONS?.trim() || null;
  return (
    <DepositClient
      initialRequests={rows.map(toDepositRequestView)}
      initialBalanceIdr={profile.balanceIdr}
      instructions={instructions}
    />
  );
}
