"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleDollarSign, Info, RefreshCw, ShieldCheck } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, friendlyApiError } from "@/lib/api/client";
import { formatDateTime, formatIDR } from "@/lib/format";

interface BalanceResult {
  amount: number;
  currency: "IDR";
  note: string;
}

export function ProviderBalanceClient() {
  const [balance, setBalance] = useState<BalanceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<{ balance: BalanceResult }>("/api/provider/balance");
      setBalance(result.balance);
      setLastUpdated(new Date().toISOString());
    } catch (caught) {
      setError(friendlyApiError(caught, "Saldo provider tidak dapat dimuat."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Administrator"
        title="Saldo Provider"
        description="Saldo operasional akun JasaOTP. Informasi ini hanya tersedia untuk administrator dan tidak sama dengan saldo dompet pengguna."
        actions={<RefreshButton onClick={() => void load()} loading={loading} label="Refresh saldo" />}
      />

      {error && <ErrorState title="Saldo provider gagal dimuat" message={error} onRetry={() => void load()} retrying={loading} />}

      <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
          <CardHeader className="relative flex flex-row items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo akun penyedia</p>
              {loading ? (
                <Skeleton className="mt-4 h-11 w-56" />
              ) : (
                <p className="mt-3 text-4xl font-extrabold tracking-tight">
                  {balance ? (balance.currency === "IDR" ? formatIDR(balance.amount) : String(balance.amount)) : "—"}
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {lastUpdated ? `Terakhir diperiksa ${formatDateTime(lastUpdated)} WIB` : "Belum pernah diperiksa"}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {balance ? (
              <Badge variant="cyan">Endpoint /balance.php</Badge>
            ) : !loading && !error ? (
              <p className="text-sm text-muted-foreground">Belum ada data saldo.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-violet-300" /> Catatan penting</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              Dokumentasi <code>/balance.php</code> mengembalikan <code>data.saldo</code>. Karena harga layanan provider memakai Rupiah, tampilan ini memformat nilai tersebut sebagai IDR.
            </p>
            <p>
              Jika penyedia Anda menyatakan satuan lain, sesuaikan label pada lapisan integrasi provider sebelum produksi.
            </p>
            <Alert variant="warning">
              <ShieldCheck className="h-4 w-4" />
              <div>
                <AlertTitle>Bukan saldo pengguna</AlertTitle>
                <AlertDescription>Jangan memindahkan angka ini ke dompet pengguna. Setiap kredit saldo pengguna harus melalui ledger deposit terverifikasi.</AlertDescription>
              </div>
            </Alert>
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 text-xs font-bold text-violet-300 hover:underline">
              <RefreshCw className="h-3.5 w-3.5" /> Periksa ulang sekarang
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
