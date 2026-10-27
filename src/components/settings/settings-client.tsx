"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, CircleAlert, RotateCcw, Settings2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiGet, friendlyApiError } from "@/lib/api/client";
import { DEFAULT_SETTINGS, saveSettings, useSettings, type UserSettings } from "@/lib/hooks/use-settings";

interface HealthResponse {
  status: string;
  configured: boolean;
  checks: Record<string, boolean>;
}

const checkLabels: Record<string, string> = {
  supabaseUrl: "Supabase URL",
  supabaseAnonKey: "Supabase anon key",
  supabaseServiceRoleKey: "Service role key",
  providerApiKey: "API key provider",
  adminEmails: "Daftar email admin",
  cronSecret: "Cron secret",
  appUrl: "URL aplikasi",
  depositInstructions: "Instruksi deposit",
};

export function SettingsClient() {
  const { settings } = useSettings();
  const [draft, setDraft] = useState<UserSettings>(settings);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => setDraft(settings), [settings]);

  async function loadHealth() {
    setRefreshing(true);
    setHealthError(null);
    try {
      const result = await apiGet<HealthResponse>("/api/health");
      setHealth(result);
    } catch (error) {
      setHealthError(friendlyApiError(error, "Status server tidak dapat dimuat."));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadHealth();
  }, []);

  function save() {
    saveSettings(draft);
    toast.success("Preferensi tersimpan pada perangkat ini.");
  }

  function reset() {
    setDraft(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    toast.success("Preferensi dikembalikan ke nilai awal.");
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Preferensi"
        title="Pengaturan"
        description="Atur perilaku antarmuka pada perangkat ini. Pengaturan keamanan server tetap dikendalikan environment variable."
        actions={<RefreshButton onClick={() => void loadHealth()} loading={refreshing} label="Cek status" />}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-violet-300" /> Tampilan & pemantauan</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Interval pembaruan status</Label>
              <Select
                value={String(draft.pollIntervalSeconds)}
                onValueChange={(value) => setDraft((current) => ({ ...current, pollIntervalSeconds: Number(value) as UserSettings["pollIntervalSeconds"] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8 detik · lebih responsif</SelectItem>
                  <SelectItem value="12">12 detik · seimbang</SelectItem>
                  <SelectItem value="20">20 detik · hemat</SelectItem>
                  <SelectItem value="30">30 detik · paling hemat</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">
                Polling otomatis berhenti saat OTP diterima, pesanan berakhir, atau tab tidak aktif.
              </p>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
              <div>
                <p className="text-sm font-bold">Kurangi animasi</p>
                <p className="mt-1 text-xs text-muted-foreground">Menonaktifkan transisi dan animasi antarmuka.</p>
              </div>
              <Switch
                checked={draft.reduceMotion}
                onCheckedChange={(checked) => setDraft((current) => ({ ...current, reduceMotion: checked }))}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={save}><CheckCircle2 className="h-4 w-4" /> Simpan preferensi</Button>
              <Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset</Button>
              <Button variant="ghost" onClick={() => toast.info("Notifikasi Kaii OTP berfungsi.", { description: "Toast ini dipicu langsung dari tombol pengaturan." })}>
                <Bell className="h-4 w-4" /> Uji notifikasi
              </Button>
            </div>
            <Alert>
              <AlertDescription>Preferensi ini hanya tersimpan di localStorage perangkat Anda, bukan pada database server.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-cyan-300" /> Status server</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {healthError && <Alert variant="destructive"><AlertDescription>{healthError}</AlertDescription></Alert>}
            {health ? (
              <>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-4">
                  <div>
                    <p className="text-sm font-bold">Konfigurasi</p>
                    <p className="mt-1 text-xs text-muted-foreground">{health.status === "ok" ? "Server merespons" : "Status tidak diketahui"}</p>
                  </div>
                  <Badge variant={health.configured ? "green" : "amber"}>
                    {health.configured ? "Lengkap" : "Perlu perhatian"}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(health.checks).map(([key, ready]) => (
                    <div key={key} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-xs">
                      {ready ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" /> : <CircleAlert className="h-4 w-4 shrink-0 text-amber-300" />}
                      <span className="truncate">{checkLabels[key] ?? key}</span>
                    </div>
                  ))}
                </div>
                <Alert variant="info">
                  <AlertTitle>Nilai rahasia tidak ditampilkan</AlertTitle>
                  <AlertDescription>Endpoint health hanya mengembalikan status boolean, bukan isi API key.</AlertDescription>
                </Alert>
              </>
            ) : (
              !healthError && <p className="text-sm text-muted-foreground">Memuat status server...</p>
            )}
            <div className="flex flex-wrap gap-3 text-xs font-semibold text-violet-300">
              <Link href="/konfigurasi" className="hover:underline">Panduan konfigurasi</Link>
              <Link href="/dokumentasi" className="hover:underline">Dokumentasi API</Link>
              <Link href="/kebijakan-privasi" className="hover:underline">Kebijakan privasi</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
