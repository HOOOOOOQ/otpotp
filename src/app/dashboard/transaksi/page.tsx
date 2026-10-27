import type { Metadata } from "next";
import { TransactionsClient } from "@/components/wallet/transactions-client";
import { requirePageUser } from "@/lib/auth/page-guards";
import { listTransactionRows } from "@/lib/db/orders";
import { toTransactionView } from "@/lib/orders/mapper";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Riwayat Transaksi" };

export default async function TransactionsPage() {
  const { profile } = await requirePageUser("/dashboard/transaksi");
  const rows = await listTransactionRows(profile.id);
  return (
    <TransactionsClient
      initialTransactions={rows.map(toTransactionView)}
      initialBalanceIdr={profile.balanceIdr}
    />
  );
}
