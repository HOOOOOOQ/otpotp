"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package, Search } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatIDR } from "@/lib/format";
import { usePolling } from "@/lib/hooks/use-polling";
import { useSettings } from "@/lib/hooks/use-settings";
import { ORDER_STATUS_META } from "@/lib/orders/status";
import type { OrderStatus, PublicOrder } from "@/lib/types";

export function OrdersClient({ initialOrders }: { initialOrders: PublicOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [search, setSearch] = useState("");
  const [pollError, setPollError] = useState<string | null>(null);
  const { settings } = useSettings();
  const { refresh, refreshing } = usePolling<{ orders: PublicOrder[] }>("/api/orders?limit=100", {
    enabled: true,
    intervalMs: settings.pollIntervalSeconds * 1000,
    onData: (data) => {
      setOrders(data.orders);
      setPollError(null);
    },
    onError: setPollError,
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (status !== "all" && order.status !== status) return false;
      if (!query) return true;
      return [
        order.serviceName,
        order.serviceCode,
        order.phoneNumber ?? "",
        order.providerOrderId ?? "",
        order.id,
        order.countryName,
        order.operator,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [orders, status, search]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Pesanan"
        title="Pesanan Saya"
        description="Semua nomor virtual yang Anda beli. Hanya pesanan milik akun ini yang dapat dilihat; status diperbarui berkala."
        actions={
          <>
            <Button asChild size="sm">
              <Link href="/dashboard/beli">Beli nomor baru</Link>
            </Button>
            <RefreshButton onClick={() => void refresh()} loading={refreshing} />
          </>
        }
      />

      {pollError && (
        <Alert variant="warning">
          <AlertDescription>Pembaruan otomatis terganggu: {pollError}. Data terakhir tetap ditampilkan.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari layanan, nomor, atau ID pesanan..."
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as "all" | OrderStatus)}>
          <SelectTrigger>
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            {Object.entries(ORDER_STATUS_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title={orders.length === 0 ? "Belum ada pesanan" : "Tidak ada hasil"}
            description={
              orders.length === 0
                ? "Pesanan yang berhasil dibuat akan muncul di sini beserta status terbarunya."
                : "Ubah kata kunci atau filter status untuk melihat pesanan lain."
            }
            action={
              orders.length === 0 ? (
                <Button asChild size="sm"><Link href="/dashboard/beli">Beli nomor pertama</Link></Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => { setSearch(""); setStatus("all"); }}>Reset filter</Button>
              )
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Layanan</TableHead>
                  <TableHead>Nomor / ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <p className="font-bold">{order.serviceName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{order.countryName} · {order.operator}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-xs text-white">{order.phoneNumber ?? "Belum tersedia"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">#{order.providerOrderId ?? order.id.slice(0, 8)}</p>
                    </TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell className="font-semibold">{formatIDR(order.priceIdr)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/pesanan/${order.id}`}>Detail <ArrowRight className="h-4 w-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="divide-y divide-white/[0.06] md:hidden">
            {filtered.map((order) => (
              <Link key={order.id} href={`/dashboard/pesanan/${order.id}`} className="block p-4 transition-colors hover:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{order.serviceName}</p>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{order.phoneNumber ?? "Nomor belum tersedia"}</p>
                  </div>
                  <StatusBadge status={order.status} showDot={false} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatIDR(order.priceIdr)} · {formatDateTime(order.createdAt)}</span>
                  <span className="font-bold text-violet-300">Detail →</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
