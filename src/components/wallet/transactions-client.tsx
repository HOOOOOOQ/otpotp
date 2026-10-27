"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ReceiptText, Search, Wallet } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatIDR } from "@/lib/format";
import { usePolling } from "@/lib/hooks/use-polling";
import { useSettings } from "@/lib/hooks/use-settings";
import type { ProfileView, TransactionView } from "@/lib/types";

type Filter = "all" | TransactionView["type"];

const typeMeta: Record<TransactionView["type"], { label: string; tone: "red" | "green" | "cyan"; icon: typeof ArrowUpRight }> = {
  debit: { label: "Debit", tone: "red", icon: ArrowUpRight },
  refund: { label: "Refund", tone: "green", icon: ArrowDownLeft },
  deposit: { label: "Deposit", tone: "cyan", icon: Wallet },
};

export function TransactionsClient({
  initialTransactions,
  initialBalanceIdr,
}: {
  initialTransactions: TransactionView[];
  initialBalanceIdr: number;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [balanceIdr, setBalanceIdr] = useState(initialBalanceIdr);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [pollError, setPollError] = useState<string | null>(null);
  const { settings } = useSettings();
  const { refresh, refreshing } = usePolling<{ transactions: TransactionView[] }>(
    "/api/wallet/transactions",
    {
      enabled: true,
      intervalMs: Math.max(settings.pollIntervalSeconds * 2000, 20000),
      onData: (data) => {
        setTransactions(data.transactions);
        setPollError(null);
      },
      onError: setPollError,
    },
  );

  usePolling<{ profile: ProfileView }>("/api/wallet/summary", {
    enabled: true,
    intervalMs: Math.max(settings.pollIntervalSeconds * 2000, 20000),
    onData: (data) => setBalanceIdr(data.profile.balanceIdr),
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((transaction) => {
      if (filter !== "all" && transaction.type !== filter) return false;
      if (!query) return true;
      return [transaction.description, transaction.id, transaction.orderId ?? "", transaction.type]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [transactions, filter, search]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Keuangan"
        title="Riwayat Transaksi"
        description="Setiap perubahan saldo tercatat di ledger. Debit, refund, dan deposit tidak dapat diubah langsung dari browser."
        actions={
          <>
            <Button asChild size="sm"><Link href="/dashboard/deposit">Ajukan deposit</Link></Button>
            <RefreshButton onClick={() => void refresh()} loading={refreshing} />
          </>
        }
      />

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo saat ini</p>
          <p className="mt-2 text-3xl font-extrabold">{formatIDR(balanceIdr)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Dompet pengguna, terpisah dari saldo provider.</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
          <Wallet className="h-6 w-6" />
        </div>
      </Card>

      {pollError && <Alert variant="warning"><AlertDescription>{pollError} Data terakhir tetap ditampilkan.</AlertDescription></Alert>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="debit">Debit</TabsTrigger>
            <TabsTrigger value="refund">Refund</TabsTrigger>
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari transaksi..." className="pl-10" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ReceiptText}
            title={transactions.length === 0 ? "Belum ada transaksi" : "Tidak ada hasil"}
            description={
              transactions.length === 0
                ? "Transaksi pertama akan muncul setelah deposit diverifikasi atau nomor dibeli."
                : "Ubah filter atau kata kunci pencarian."
            }
            action={transactions.length === 0 ? <Button asChild size="sm"><Link href="/dashboard/beli">Beli nomor</Link></Button> : undefined}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Saldo akhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((transaction) => {
                  const meta = typeMeta[transaction.type];
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell><Badge variant={meta.tone}>{meta.label}</Badge></TableCell>
                      <TableCell>
                        <p className="font-semibold">{transaction.description}</p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">{transaction.id.slice(0, 8)}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(transaction.createdAt)} WIB</TableCell>
                      <TableCell className={`text-right font-bold ${transaction.amountIdr >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                        {transaction.amountIdr >= 0 ? "+" : ""}{formatIDR(transaction.amountIdr)}
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatIDR(transaction.balanceAfterIdr)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="divide-y divide-white/[0.06] md:hidden">
            {filtered.map((transaction) => {
              const meta = typeMeta[transaction.type];
              const Icon = meta.icon;
              return (
                <div key={transaction.id} className="flex items-start gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-violet-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><p className="truncate text-sm font-bold">{transaction.description}</p><Badge variant={meta.tone}>{meta.label}</Badge></div>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(transaction.createdAt)} WIB</p>
                    <p className="mt-2 text-xs text-muted-foreground">Saldo akhir {formatIDR(transaction.balanceAfterIdr)}</p>
                  </div>
                  <p className={`shrink-0 text-sm font-bold ${transaction.amountIdr >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {transaction.amountIdr >= 0 ? "+" : ""}{formatIDR(transaction.amountIdr)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
