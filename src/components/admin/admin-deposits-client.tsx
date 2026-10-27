"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiPatch, friendlyApiError } from "@/lib/api/client";
import { formatDateTime, formatIDR } from "@/lib/format";
import { usePolling } from "@/lib/hooks/use-polling";
import { useSettings } from "@/lib/hooks/use-settings";
import type { DepositRequestView } from "@/lib/types";

type Decision = "approve" | "reject";
type Filter = "pending" | "all" | "approved" | "rejected";

const statusMeta: Record<DepositRequestView["status"], { label: string; tone: "amber" | "green" | "red" }> = {
  pending: { label: "Menunggu", tone: "amber" },
  approved: { label: "Disetujui", tone: "green" },
  rejected: { label: "Ditolak", tone: "red" },
};

export function AdminDepositsClient({ initialRequests }: { initialRequests: DepositRequestView[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState<Filter>("pending");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [selected, setSelected] = useState<DepositRequestView | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const { settings } = useSettings();
  const { refresh, refreshing } = usePolling<{ requests: DepositRequestView[] }>(
    "/api/admin/deposits",
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

  const filtered = useMemo(
    () => requests.filter((request) => filter === "all" || request.status === filter),
    [requests, filter],
  );
  const pendingCount = requests.filter((request) => request.status === "pending").length;

  function openDialog(request: DepositRequestView, action: Decision) {
    setSelected(request);
    setDecision(action);
    setAdminNote("");
  }

  async function submitDecision() {
    if (!selected || !decision || processing) return;
    setProcessing(true);
    try {
      const result = await apiPatch<{ outcome: string; message: string }>(
        `/api/admin/deposits/${selected.id}`,
        { action: decision, adminNote },
      );
      toast.success(result.message);
      setSelected(null);
      setDecision(null);
      void refresh();
    } catch (error) {
      toast.error(friendlyApiError(error, "Keputusan deposit gagal diproses."));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Administrator"
        title="Verifikasi Deposit"
        description="Setujui hanya pembayaran yang benar-benar terverifikasi. Fungsi SQL atomik mencegah saldo dikredit dua kali."
        actions={<RefreshButton onClick={() => void refresh()} loading={refreshing} />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-xs text-muted-foreground">Menunggu</p><p className="mt-2 text-2xl font-extrabold text-amber-200">{pendingCount}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground">Disetujui</p><p className="mt-2 text-2xl font-extrabold text-emerald-200">{requests.filter((item) => item.status === "approved").length}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground">Ditolak</p><p className="mt-2 text-2xl font-extrabold text-red-200">{requests.filter((item) => item.status === "rejected").length}</p></Card>
      </div>

      {pollError && <Alert variant="warning"><AlertDescription>{pollError} Data terakhir tetap ditampilkan.</AlertDescription></Alert>}

      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
        <TabsList>
          <TabsTrigger value="pending">Menunggu</TabsTrigger>
          <TabsTrigger value="approved">Disetujui</TabsTrigger>
          <TabsTrigger value="rejected">Ditolak</TabsTrigger>
          <TabsTrigger value="all">Semua</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Clock3}
            title="Tidak ada permintaan"
            description="Belum ada permintaan deposit pada filter ini."
          />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((request) => {
            const meta = statusMeta[request.status];
            return (
              <Card key={request.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-extrabold">{formatIDR(request.amountIdr)}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{request.userEmail ?? request.userId}</p>
                  </div>
                  <Badge variant={meta.tone}>{meta.label}</Badge>
                </div>
                <div className="mt-4 space-y-1 text-xs">
                  <p className="break-all"><span className="text-muted-foreground">Referensi: </span><strong>{request.paymentReference}</strong></p>
                  <p className="text-muted-foreground">Diajukan {formatDateTime(request.createdAt)} WIB</p>
                  {request.note && <p className="break-all"><span className="text-muted-foreground">Catatan pengguna: </span>{request.note}</p>}
                  {request.adminNote && <p className="break-all text-amber-200"><span className="text-muted-foreground">Catatan admin: </span>{request.adminNote}</p>}
                </div>
                {request.status === "pending" ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => openDialog(request, "approve")}>
                      <CheckCircle2 className="h-4 w-4" /> Setujui
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDialog(request, "reject")}>
                      <XCircle className="h-4 w-4" /> Tolak
                    </Button>
                  </div>
                ) : (
                  <p className="mt-5 text-xs text-muted-foreground">Sudah ditinjau. Tidak ada saldo tambahan yang dapat diberikan untuk permintaan ini.</p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(selected && decision)} onOpenChange={(open) => !processing && !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision === "approve" ? "Setujui deposit ini?" : "Tolak deposit ini?"}</DialogTitle>
            <DialogDescription>
              {decision === "approve"
                ? "Pastikan pembayaran sudah benar-benar Anda verifikasi. Saldo pengguna akan dikredit satu kali oleh fungsi SQL atomik."
                : "Permintaan akan ditolak tanpa mengubah saldo pengguna."}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4 text-sm">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Pengguna</span><strong className="truncate">{selected.userEmail ?? selected.userId}</strong></div>
              <div className="mt-2 flex justify-between gap-3"><span className="text-muted-foreground">Nominal</span><strong>{formatIDR(selected.amountIdr)}</strong></div>
              <div className="mt-2 flex justify-between gap-3"><span className="text-muted-foreground">Referensi</span><strong className="max-w-[60%] truncate text-right">{selected.paymentReference}</strong></div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="admin-note">Catatan admin (opsional)</Label>
            <Textarea
              id="admin-note"
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              maxLength={500}
              placeholder="Contoh: Pembayaran cocok dengan mutasi rekening."
            />
          </div>
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>Keputusan ini dicatat pada permintaan deposit. Klik berulang tidak menambah saldo dua kali.</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={processing}>Batal</Button>
            <Button variant={decision === "reject" ? "destructive" : "default"} onClick={() => void submitDecision()} disabled={processing}>
              {processing ? "Memproses..." : decision === "approve" ? "Ya, setujui" : "Ya, tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
