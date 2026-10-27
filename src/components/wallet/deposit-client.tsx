"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CircleDollarSign,
  Clock3,
  Info,
  Search,
  Send,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiPost, friendlyApiError } from "@/lib/api/client";
import { formatDateTime, formatIDR } from "@/lib/format";
import { usePolling } from "@/lib/hooks/use-polling";
import { useSettings } from "@/lib/hooks/use-settings";
import type { DepositRequestView, ProfileView } from "@/lib/types";

type StatusFilter = "all" | DepositRequestView["status"];

const statusMeta: Record<DepositRequestView["status"], { label: string; tone: "amber" | "green" | "red" }> = {
  pending: { label: "Menunggu", tone: "amber" },
  approved: { label: "Disetujui", tone: "green" },
  rejected: { label: "Ditolak", tone: "red" },
};

export function DepositClient({
  initialRequests,
  initialBalanceIdr,
  instructions,
}: {
  initialRequests: DepositRequestView[];
  initialBalanceIdr: number;
  instructions: string | null;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [balanceIdr, setBalanceIdr] = useState(initialBalanceIdr);
  const [form, setForm] = useState({ amountIdr: "", paymentReference: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [pollError, setPollError] = useState<string | null>(null);
  const { settings } = useSettings();
  const { refresh, refreshing } = usePolling<{ requests: DepositRequestView[] }>(
    "/api/wallet/deposits",
    {
      enabled: true,
      intervalMs: Math.max(settings.pollIntervalSeconds * 2000, 20000),
      onData: (data) => {
        setRequests(data.requests);
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
    return requests.filter((request) => {
      if (filter !== "all" && request.status !== filter) return false;
      if (!query) return true;
      return [request.paymentReference, request.note ?? "", request.id, request.adminNote ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [requests, filter, search]);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await apiPost<{ request: DepositRequestView; message: string }>(
        "/api/wallet/deposits",
        {
          amountIdr: Number(form.amountIdr),
          paymentReference: form.paymentReference,
          note: form.note,
        },
      );
      setRequests((current) => [result.request, ...current]);
      setForm({ amountIdr: "", paymentReference: "", note: "" });
      toast.success(result.message);
    } catch (error) {
      toast.error(friendlyApiError(error, "Permintaan deposit gagal dibuat."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Dompet pengguna"
        title="Deposit Saldo"
        description="Deposit bersifat manual dan tidak otomatis. Saldo hanya bertambah setelah administrator memverifikasi pembayaran Anda."
        actions={<RefreshButton onClick={() => void refresh()} loading={refreshing} />}
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-violet-300" /> Instruksi pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5">
              {instructions ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-white">{instructions}</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-amber-200">Instruksi transfer belum dikonfigurasi.</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Administrator perlu mengisi <code>NEXT_PUBLIC_DEPOSIT_INSTRUCTIONS</code> sebelum produksi. Jangan melakukan transfer tanpa instruksi resmi. Anda tetap dapat mencatat permintaan untuk ditindaklanjuti admin.
                  </p>
                </div>
              )}
            </div>
            <Alert variant="warning">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Jangan menulis API key, kata sandi, atau kode OTP pada catatan deposit.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-cyan-300" /> Saldo Anda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo terverifikasi</p>
              <p className="mt-2 text-3xl font-extrabold">{formatIDR(balanceIdr)}</p>
            </div>
            <Alert>
              <BadgeCheck className="h-4 w-4" />
              <AlertDescription>
                API JasaOTP v2 tidak menyediakan endpoint deposit pengguna. Karena itu Kaii OTP tidak berpura-pura memproses pembayaran otomatis.
              </AlertDescription>
            </Alert>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/transaksi">Lihat ledger transaksi</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-violet-300" /> Ajukan permintaan deposit</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Nominal (IDR)</Label>
              <Input
                id="amount"
                type="number"
                inputMode="numeric"
                min={10000}
                max={100000000}
                step={1000}
                value={form.amountIdr}
                onChange={(event) => update("amountIdr", event.target.value)}
                placeholder="Contoh: 50000"
                required
              />
              <p className="text-xs text-muted-foreground">Minimal Rp10.000, maksimal Rp100.000.000.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Referensi pembayaran</Label>
              <Input
                id="reference"
                value={form.paymentReference}
                onChange={(event) => update("paymentReference", event.target.value)}
                placeholder="Nomor referensi transfer / nama pengirim"
                minLength={4}
                maxLength={120}
                required
              />
              <p className="text-xs text-muted-foreground">Gunakan referensi yang dapat diverifikasi admin.</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="note">Catatan (opsional)</Label>
              <Textarea
                id="note"
                value={form.note}
                onChange={(event) => update("note", event.target.value)}
                placeholder="Contoh: Transfer dari bank BCA atas nama ..."
                maxLength={500}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                <Send className="h-4 w-4" /> {submitting ? "Mengirim..." : "Kirim permintaan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {pollError && <Alert variant="warning"><AlertDescription>{pollError} Data terakhir tetap ditampilkan.</AlertDescription></Alert>}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold">Riwayat permintaan</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Tabs value={filter} onValueChange={(value) => setFilter(value as StatusFilter)}>
              <TabsList>
                <TabsTrigger value="all">Semua</TabsTrigger>
                <TabsTrigger value="pending">Menunggu</TabsTrigger>
                <TabsTrigger value="approved">Disetujui</TabsTrigger>
                <TabsTrigger value="rejected">Ditolak</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative sm:w-56">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari referensi..." className="pl-10" />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={Clock3}
              title={requests.length === 0 ? "Belum ada permintaan deposit" : "Tidak ada hasil"}
              description={
                requests.length === 0
                  ? "Permintaan deposit yang Anda kirim akan muncul di sini beserta status verifikasi admin."
                  : "Ubah filter atau kata kunci pencarian."
              }
            />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((request) => {
              const meta = statusMeta[request.status];
              return (
                <Card key={request.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-extrabold">{formatIDR(request.amountIdr)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(request.createdAt)} WIB</p>
                    </div>
                    <Badge variant={meta.tone}>{meta.label}</Badge>
                  </div>
                  <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4 text-xs">
                    <p className="break-all"><span className="text-muted-foreground">Referensi: </span><strong>{request.paymentReference}</strong></p>
                    {request.note && <p className="break-all"><span className="text-muted-foreground">Catatan: </span>{request.note}</p>}
                    {request.adminNote && <p className="break-all text-amber-200"><span className="text-muted-foreground">Catatan admin: </span>{request.adminNote}</p>}
                    {request.reviewedAt && <p className="text-muted-foreground">Ditinjau {formatDateTime(request.reviewedAt)} WIB</p>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
