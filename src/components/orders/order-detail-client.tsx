"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock3,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { Countdown } from "@/components/shared/countdown";
import { CopyButton } from "@/components/shared/copy-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ApiClientError,
  apiGet,
  apiPost,
  friendlyApiError,
  newIdempotencyKey,
} from "@/lib/api/client";
import { formatDateTime, formatIDR } from "@/lib/format";
import { usePolling } from "@/lib/hooks/use-polling";
import { useSettings } from "@/lib/hooks/use-settings";
import { canCancelOrder, canPollOtp, statusMessage } from "@/lib/orders/status";
import type {
  CancelOrderResponse,
  OtpCheckResponse,
  PublicOrder,
} from "@/lib/types";

const AMBIGUOUS_CANCEL_CODES = new Set([
  "CANCEL_RESULT_UNKNOWN",
  "CANCEL_REFUND_REVIEW",
  "CANCEL_IN_PROGRESS",
  "PROVIDER_RESULT_UNKNOWN",
]);

export function OrderDetailClient({ initialOrder }: { initialOrder: PublicOrder }) {
  const [order, setOrder] = useState(initialOrder);
  const [otpCode, setOtpCode] = useState(initialOrder.otpCode);
  const [otpExpiresAt, setOtpExpiresAt] = useState(initialOrder.otpExpiresAt);
  const [message, setMessage] = useState(
    initialOrder.otpCode ? "Kode OTP tersedia." : statusMessage(initialOrder.status),
  );
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelKey, setCancelKey] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [blockCancelRetry, setBlockCancelRetry] = useState(false);
  const announcedOtp = useRef(Boolean(initialOrder.otpCode));
  const { settings } = useSettings();

  const handleResult = useCallback((result: OtpCheckResponse) => {
    setOrder(result.order);
    setOtpCode(result.otpCode);
    setOtpExpiresAt(result.otpExpiresAt);
    setMessage(result.message);
    setLastChecked(Date.now());
    setPollError(null);
    if (result.otpCode && !announcedOtp.current) {
      announcedOtp.current = true;
      toast.success("Kode OTP diterima.");
    }
  }, []);

  const { refreshing } = usePolling<OtpCheckResponse>(
    `/api/orders/${order.id}/otp`,
    {
      enabled: canPollOtp(order.status),
      intervalMs: settings.pollIntervalSeconds * 1000,
      onData: handleResult,
      onError: setPollError,
    },
  );

  async function manualCheck() {
    if (checking || refreshing) return;
    setChecking(true);
    try {
      const result = await apiGet<OtpCheckResponse>(`/api/orders/${order.id}/otp`);
      handleResult(result);
      if (result.status === "waiting_otp") toast.info(result.message);
    } catch (error) {
      const text = friendlyApiError(error, "Pemeriksaan OTP gagal.");
      setPollError(text);
      toast.error(text);
    } finally {
      setChecking(false);
    }
  }

  async function refreshOrder(silent = false) {
    if (!silent) setChecking(true);
    try {
      const result = await apiGet<{ order: PublicOrder }>(`/api/orders/${order.id}`);
      setOrder(result.order);
      setOtpCode(result.order.otpCode);
      setOtpExpiresAt(result.order.otpExpiresAt);
      if (result.order.otpCode) announcedOtp.current = true;
      if (!silent) toast.success("Detail pesanan diperbarui.");
    } catch (error) {
      if (!silent) toast.error(friendlyApiError(error, "Detail pesanan gagal dimuat."));
    } finally {
      if (!silent) setChecking(false);
    }
  }

  function openCancel() {
    setCancelKey(newIdempotencyKey());
    setCancelError(null);
    setBlockCancelRetry(false);
    setCancelOpen(true);
  }

  async function confirmCancel() {
    if (cancelling || blockCancelRetry) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const result = await apiPost<CancelOrderResponse>(
        `/api/orders/${order.id}/cancel`,
        undefined,
        { "Idempotency-Key": cancelKey },
      );
      if (result.order) {
        setOrder(result.order);
        setOtpCode(result.order.otpCode);
        setOtpExpiresAt(result.order.otpExpiresAt);
      } else {
        setOrder((current) => ({ ...current, status: result.status }));
      }
      setMessage(result.message);
      setCancelOpen(false);
      toast.success(result.message);
    } catch (error) {
      const text = friendlyApiError(error, "Pembatalan gagal.");
      setCancelError(text);
      if (error instanceof ApiClientError && AMBIGUOUS_CANCEL_CODES.has(error.code)) {
        setBlockCancelRetry(true);
      }
      toast.error(text);
    } finally {
      setCancelling(false);
      void refreshOrder(true);
    }
  }

  const waiting = canPollOtp(order.status);
  const otpExpired = order.status === "otp_received" && !otpCode;
  const showOtpCard = order.status === "otp_received" || waiting || order.status === "cancel_pending";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Detail pesanan"
        title={`Pesanan #${order.providerOrderId ?? order.id.slice(0, 8)}`}
        description="Gunakan nomor ini pada aplikasi tujuan. Kode OTP hanya ditampilkan setelah penyedia mengembalikan data yang valid."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/pesanan"><ArrowLeft className="h-4 w-4" /> Kembali</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void refreshOrder()} disabled={checking}>
              <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Muat ulang</span>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-4">
          <Card className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
            <CardHeader className="relative flex flex-row items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nomor telepon</p>
                <p className="mt-3 break-all font-mono text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {order.phoneNumber ?? "Belum tersedia"}
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <Smartphone className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="relative flex flex-wrap items-center gap-2">
              <CopyButton value={order.phoneNumber} label="Salin nomor" successLabel="Nomor tersalin" />
              <StatusBadge status={order.status} />
              <span className="text-xs text-muted-foreground">
                Diperbarui {formatDateTime(order.updatedAt)} WIB
              </span>
            </CardContent>
          </Card>

          {showOtpCard && (
            <Card className="glow-border">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-cyan-300" /> Kode OTP</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{message}</p>
                </div>
                {otpCode && <CopyButton value={otpCode} label="Salin OTP" successLabel="OTP tersalin" />}
              </CardHeader>
              <CardContent className="space-y-4">
                {otpCode ? (
                  <>
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.06] p-6 text-center">
                      <p className="font-mono text-4xl font-extrabold tracking-[0.18em] text-cyan-100 sm:text-5xl">
                        {otpCode}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {otpExpiresAt
                          ? `Kode dihapus otomatis ${formatDateTime(otpExpiresAt)} WIB.`
                          : "Kode disimpan sementara dan akan dihapus otomatis."}
                      </p>
                    </div>
                    <Alert variant="warning">
                      <AlertDescription>Jangan bagikan kode ini kepada siapa pun. Tim Kaii OTP tidak akan meminta kode OTP Anda.</AlertDescription>
                    </Alert>
                  </>
                ) : otpExpired ? (
                  <Alert variant="warning">
                    <Clock3 className="h-5 w-5" />
                    <div>
                      <AlertTitle>Kode sudah dihapus</AlertTitle>
                      <AlertDescription>
                        Kode OTP pernah diterima, tetapi sudah melewati masa retensi 15 menit dan dihapus dari database.
                      </AlertDescription>
                    </div>
                  </Alert>
                ) : waiting ? (
                  <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-black/20 p-6">
                    <div className="flex items-center gap-3 text-sm font-semibold text-cyan-200">
                      <span className="h-2 w-2 animate-soft-pulse rounded-full bg-cyan-300" />
                      Menunggu SMS dari penyedia
                    </div>
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <p className="text-xs leading-5 text-muted-foreground">
                      Pemeriksaan berjalan otomatis saat tab aktif dan berhenti setelah kode diterima atau pesanan berakhir.
                    </p>
                  </div>
                ) : order.status === "cancel_pending" ? (
                  <Alert variant="warning">
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button variant="outline" size="sm" onClick={() => void manualCheck()} disabled={checking || refreshing}>
                    <RefreshCw className={(checking || refreshing) ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                    Periksa OTP
                  </Button>
                  {lastChecked && (
                    <span className="text-xs text-muted-foreground">
                      Terakhir diperiksa {formatDateTime(new Date(lastChecked).toISOString())} WIB
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!showOtpCard && (
            <Card>
              <CardHeader><CardTitle>Status pesanan</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={order.status} />
                  <p className="text-sm text-muted-foreground">{message}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void manualCheck()} disabled={checking || refreshing}>
                  <RefreshCw className={(checking || refreshing) ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Periksa status
                </Button>
              </CardContent>
            </Card>
          )}

          {pollError && (
            <Alert variant="warning">
              <AlertDescription>{pollError} Status terakhir tetap ditampilkan.</AlertDescription>
            </Alert>
          )}

          {order.status === "needs_review" && (
            <Alert variant="warning">
              <ShieldAlert className="h-5 w-5" />
              <div>
                <AlertTitle>Perlu peninjauan administrator</AlertTitle>
                <AlertDescription>
                  Hasil operasi penyedia tidak dapat dipastikan. Jangan mengulangi pembelian atau pembatalan.{" "}
                  <Link href="/kontak" className="font-bold underline">Hubungi dukungan</Link> dengan ID pesanan ini.
                </AlertDescription>
              </div>
            </Alert>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Informasi pesanan</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="ID pesanan provider" value={order.providerOrderId ?? "Belum tersedia"} mono copy />
              <InfoRow label="ID internal" value={order.id} mono copy />
              <InfoRow label="Aplikasi" value={order.serviceName} />
              <InfoRow label="Kode layanan" value={order.serviceCode} mono />
              <InfoRow label="Negara" value={`${order.countryName} · #${order.countryId}`} />
              <InfoRow label="Operator" value={order.operator} />
              <InfoRow label="Harga" value={formatIDR(order.priceIdr)} />
              <InfoRow label="Dibuat" value={`${formatDateTime(order.createdAt)} WIB`} />
              <InfoRow label="Diperbarui" value={`${formatDateTime(order.updatedAt)} WIB`} />
            </CardContent>
          </Card>

          {order.expiresAt ? (
            <Countdown expiresAt={order.expiresAt} />
          ) : (
            <Alert variant="info">
              <Clock3 className="h-4 w-4" />
              <AlertDescription>
                Penyedia tidak mengirim waktu kedaluwarsa untuk pesanan ini, jadi Kaii OTP tidak menampilkan hitung mundur.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-300" /> Aksi pesanan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="destructive"
                className="w-full"
                onClick={openCancel}
                disabled={!canCancelOrder(order.status)}
              >
                <Ban className="h-4 w-4" /> Batalkan Pesanan
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                {canCancelOrder(order.status)
                  ? "Pembatalan meminta konfirmasi resmi dari provider. Refund hanya diberikan setelah nominal refund diterima."
                  : `Pesanan dengan status ${order.status} tidak dapat dibatalkan lagi.`}
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/beli">Beli nomor lain</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={cancelOpen} onOpenChange={(open) => !cancelling && setCancelOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan pesanan ini?</DialogTitle>
            <DialogDescription>
              Permintaan dikirim ke provider. Saldo Anda hanya dikredit setelah provider mengonfirmasi nominal refund.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4 text-sm">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Nomor</span><strong className="font-mono">{order.phoneNumber ?? "—"}</strong></div>
            <div className="mt-2 flex justify-between gap-3"><span className="text-muted-foreground">Harga</span><strong>{formatIDR(order.priceIdr)}</strong></div>
            <div className="mt-2 flex justify-between gap-3"><span className="text-muted-foreground">ID provider</span><strong className="font-mono text-xs">{order.providerOrderId ?? "—"}</strong></div>
          </div>
          {cancelError && (
            <Alert variant="destructive">
              <AlertTitle>Pembatalan belum selesai</AlertTitle>
              <AlertDescription>
                {cancelError}
                {blockCancelRetry && <> Jangan kirim ulang pembatalan. <Link href="/kontak" className="font-bold underline">Hubungi dukungan</Link>.</>}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>Kembali</Button>
            <Button variant="destructive" onClick={() => void confirmCancel()} disabled={cancelling || blockCancelRetry}>
              {cancelling ? "Memproses..." : "Ya, batalkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
  copy = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copy?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span className={`min-w-0 break-all text-right font-semibold ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</span>
        {copy && <CopyButton value={value} label="Salin" iconOnly variant="ghost" size="icon" className="h-7 w-7" />}
      </div>
    </div>
  );
}
