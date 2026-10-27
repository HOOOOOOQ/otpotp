import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleAlert, ExternalLink, KeyRound } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getConfigStatus } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Konfigurasi Server" };

const items = [
  { key: "supabaseUrl", label: "NEXT_PUBLIC_SUPABASE_URL", required: true, detail: "URL proyek Supabase." },
  { key: "supabaseAnonKey", label: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true, detail: "Kunci publik Supabase untuk autentikasi browser." },
  { key: "supabaseServiceRoleKey", label: "SUPABASE_SERVICE_ROLE_KEY", required: true, detail: "Kunci server untuk operasi atomik. Jangan diberi prefix NEXT_PUBLIC_." },
  { key: "providerApiKey", label: "JASAOTP_API_KEY", required: true, detail: "API key JasaOTP v2. Hanya boleh ada di environment server." },
  { key: "adminEmails", label: "ADMIN_EMAILS", required: false, detail: "Opsional: daftar email admin tambahan. Tetap butuh profiles.role = admin." },
  { key: "cronSecret", label: "CRON_SECRET", required: false, detail: "Opsional: mengamankan route /api/cron/cleanup." },
  { key: "appUrl", label: "NEXT_PUBLIC_APP_URL", required: false, detail: "Opsional: origin kanonik untuk redirect dan pemeriksaan CSRF." },
  { key: "depositInstructions", label: "NEXT_PUBLIC_DEPOSIT_INSTRUCTIONS", required: false, detail: "Opsional: instruksi transfer manual yang ditampilkan ke pengguna." },
] as const;

export default function ConfigurationPage() {
  const status = getConfigStatus();
  const requiredReady = items
    .filter((item) => item.required)
    .every((item) => Boolean(status[item.key]));

  return (
    <MarketingPageShell
      eyebrow="Setup"
      title="Status konfigurasi server"
      description="Halaman ini hanya menampilkan apakah variabel sudah terisi. Nilai rahasia tidak pernah ditampilkan kepada browser."
    >
      <Alert variant={requiredReady ? "success" : "warning"}>
        {requiredReady ? <CheckCircle2 className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}
        <div>
          <AlertTitle>{requiredReady ? "Konfigurasi inti lengkap" : "Konfigurasi belum lengkap"}</AlertTitle>
          <AlertDescription>
            {requiredReady
              ? "Empat variabel inti sudah terdeteksi. Pastikan migrasi SQL sudah dijalankan dan Supabase Auth sudah dikonfigurasi."
              : "Lengkapi variabel wajib pada Vercel atau .env.local, lalu redeploy. Dashboard tetap diproteksi sampai konfigurasi inti lengkap."}
          </AlertDescription>
        </div>
      </Alert>

      <div className="grid gap-3">
        {items.map((item) => {
          const ready = Boolean(status[item.key]);
          return (
            <div key={item.key} className="glass flex items-start gap-3 rounded-xl p-4">
              {ready ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              ) : (
                <CircleAlert className={`mt-0.5 h-5 w-5 shrink-0 ${item.required ? "text-amber-300" : "text-muted-foreground"}`} />
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-xs font-bold text-white">{item.label}</code>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.required ? "bg-violet-500/15 text-violet-200" : "bg-white/[0.06] text-muted-foreground"}`}>
                    {item.required ? "WAJIB" : "OPSIONAL"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                <p className={`mt-1 text-xs font-semibold ${ready ? "text-emerald-300" : "text-amber-200"}`}>
                  {ready ? "Terisi" : "Belum terisi"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <h2>Langkah berikutnya</h2>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Salin <code>.env.example</code> menjadi <code>.env.local</code> untuk pengembangan lokal.</li>
        <li>Jalankan SQL migrasi <code>supabase/migrations/202610270001_initial.sql</code> di Supabase SQL Editor.</li>
        <li>Aktifkan Email/Password pada Supabase Auth dan daftarkan URL callback.</li>
        <li>Isi variabel yang sama pada Vercel Project Settings → Environment Variables, lalu redeploy.</li>
        <li>Setelah akun pertama dibuat, jadikan admin dengan SQL yang ada di README.</li>
      </ol>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/api/health" target="_blank">
            <KeyRound className="h-4 w-4" /> Cek health JSON
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dokumentasi">
            Baca dokumentasi <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </MarketingPageShell>
  );
}
