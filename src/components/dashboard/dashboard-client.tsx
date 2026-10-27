"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CreditCard,
  Package,
  ReceiptText,
  ShoppingCart,
  Sparkles,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { RefreshButton } from "@/components/shared/refresh-button";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatIDR, formatNumber } from "@/lib/format";
import { usePolling } from "@/lib/hooks/use-polling";
import { useSettings } from "@/lib/hooks/use-settings";
import type { DashboardSummary } from "@/lib/types";

const quickActions = [
  { href: "/dashboard/beli", label: "Beli Nomor", icon: ShoppingCart },
  { href: "/dashboard/deposit", label: "Deposit", icon: CreditCard },
  { href: "/dashboard/pesanan", label: "Pesanan", icon: Package },
  { href: "/dashboard/transaksi", label: "Transaksi", icon: ReceiptText },
];

export function DashboardClient({
  initialSummary,
  displayName,
}: {
  initialSummary: DashboardSummary;
  displayName: string;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [pollError, setPollError] = useState<string | null>(null);
  const { settings } = useSettings();
  const { refresh, refreshing } = usePolling<DashboardSummary>("/api/dashboard/summary", {
    enabled: true,
    intervalMs: settings.pollIntervalSeconds * 1000,
    onData: (data) => {
      setSummary(data);
      setPollError(null);
    },
    onError: setPollError,
  });

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/[0.07] px-3 py-1 text-xs font-semibold text-violet-200">
              <Sparkles className="h-3.5 w-3.5" /> Workspace Kaii OTP
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Halo, {displayName}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Pantau saldo, pesanan aktif, dan status OTP dari satu tempat. Data diperbarui otomatis saat halaman terbuka.
            </p>
          </div>
          <RefreshButton onClick={() => void refresh()} loading={refreshing} label="Perbarui" />
        </div>
      </div>

      {pollError && (
        <Alert variant="warning">
          <BellRing className="h-4 w-4" />
          <AlertDescription>
            Pembaruan otomatis sedang terganggu: {pollError}. Data terakhir tetap ditampilkan.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo akun" value={formatIDR(summary.profile.balanceIdr)} hint="Dompet pengguna" icon={Wallet} />
        <StatCard label="Pesanan aktif" value={formatNumber(summary.counts.active)} hint="Menunggu SMS / diproses" icon={Package} accent="cyan" />
        <StatCard label="Total pesanan" value={formatNumber(summary.counts.total)} hint="Sepanjang akun ini" icon={ReceiptText} accent="amber" />
        <StatCard label="OTP diterima" value={formatNumber(summary.counts.otpReceived)} hint="Pesanan berhasil" icon={BellRing} accent="green" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.45fr_.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Pesanan terbaru</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Status dari database dan respons provider terakhir.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/pesanan">Lihat semua <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            {summary.recentOrders.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Belum ada pesanan"
                description="Pesanan pertama Anda akan muncul di sini setelah nomor berhasil dibeli dari provider."
                action={
                  <Button asChild size="sm">
                    <Link href="/dashboard/beli">Beli nomor pertama</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                {summary.recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/dashboard/pesanan/${order.id}`}
                      className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-white/[0.025] sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold">{order.serviceName}</p>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {order.phoneNumber ?? "Nomor belum tersedia"} · {order.countryName} · {order.operator}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-5 sm:block sm:text-right">
                        <p className="text-sm font-bold">{formatIDR(order.priceIdr)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Navigasi cepat</CardTitle>
            <p className="text-xs text-muted-foreground">Aksi yang paling sering digunakan.</p>
          </CardHeader>
          <CardContent className="grid gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5 transition-all hover:border-violet-400/25 hover:bg-violet-500/[0.07]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                  <action.icon className="h-4 w-4" />
                </div>
                <span className="flex-1 text-sm font-bold">{action.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-violet-300" />
              </Link>
            ))}
            <div className="mt-2 rounded-xl border border-cyan-400/15 bg-cyan-500/[0.05] p-4 text-xs leading-6 text-muted-foreground">
              <span className="font-bold text-cyan-200">Catatan saldo:</span> saldo provider adalah dana operasional dan tidak ditampilkan sebagai saldo dompet Anda.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
