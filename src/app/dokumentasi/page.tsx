import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Dokumentasi" };

const internalRoutes = [
  ["GET", "/api/health", "Status konfigurasi server tanpa membocorkan nilai rahasia."],
  ["POST", "/api/auth/register", "Registrasi Supabase Auth dengan validasi dan rate limit."],
  ["POST", "/api/auth/login", "Login berbasis cookie HttpOnly."],
  ["POST", "/api/auth/logout", "Menghapus sesi Supabase."],
  ["POST", "/api/auth/password", "Ganti kata sandi dengan verifikasi kata sandi lama."],
  ["GET", "/api/countries", "Proxy /negara.php tanpa API key."],
  ["GET", "/api/services?negara={id}", "Proxy /layanan.php; harga dan stok terbaru."],
  ["GET", "/api/operators?negara={id}", "Proxy /operator.php."],
  ["GET / POST", "/api/orders", "Daftar pesanan milik pengguna / buat pesanan dengan idempotency key."],
  ["GET", "/api/orders/{id}", "Detail pesanan dengan validasi kepemilikan."],
  ["GET", "/api/orders/{id}/otp", "Parsing /sms.php; mengembalikan kode atau status aman."],
  ["POST", "/api/orders/{id}/cancel", "Klaim pembatalan atomik + refund resmi provider."],
  ["GET", "/api/provider/balance", "Saldo operasional provider; admin saja."],
  ["GET", "/api/dashboard/summary", "Ringkasan saldo, jumlah pesanan, dan pesanan terbaru."],
  ["GET / POST", "/api/wallet/deposits", "Daftar / buat permintaan deposit manual."],
  ["GET", "/api/wallet/transactions", "Ledger transaksi milik pengguna."],
  ["PATCH", "/api/admin/deposits/{id}", "Setujui atau tolak deposit; kredit saldo atomik."],
  ["GET", "/api/cron/cleanup", "Menghapus OTP kedaluwarsa; butuh Bearer CRON_SECRET."],
];

const providerRoutes = [
  ["GET", "/negara.php", "Tidak memakai api_key", "Envelope success + data[].id_negara/nama_negara"],
  ["GET", "/layanan.php?negara={id}", "Tidak memakai api_key", "Map negara → kode layanan → harga/stok/layanan"],
  ["GET", "/operator.php?negara={id}", "Tidak memakai api_key", "Envelope success + data[id_negara][]"],
  ["GET", "/order.php", "api_key di server", "Envelope success + data.order_id/number"],
  ["GET", "/sms.php", "api_key di server", "Envelope success + data.otp atau status menunggu"],
  ["GET", "/balance.php", "api_key di server", "Envelope success + data.saldo; admin only"],
  ["GET", "/cancel.php", "api_key di server", "Envelope success + data.refunded_amount"],
];

export default function DocumentationPage() {
  return (
    <MarketingPageShell
      eyebrow="Dokumentasi teknis"
      title="Integrasi Kaii OTP"
      description="Panduan ringkas arsitektur, kontrak provider JasaOTP v2, endpoint internal, dan praktik keamanan yang dipakai aplikasi ini."
    >
      <Alert variant="info">
        <AlertTitle>Kontrak provider diisolasi</AlertTitle>
        <AlertDescription>
          Seluruh parsing respons JasaOTP berada di <code>src/lib/provider/</code>. Jika provider mengubah struktur JSON, cukup sesuaikan lapisan itu tanpa mengubah UI atau database.
        </AlertDescription>
      </Alert>

      <h2>Arsitektur</h2>
      <p>
        Frontend Next.js hanya memanggil route handler internal. Kunci <strong>JASAOTP_API_KEY</strong> dibaca hanya pada server dan tidak pernah dikirim ke browser. Supabase Auth memakai cookie HttpOnly; database memakai Row Level Security dan fungsi SQL atomik untuk saldo serta status pesanan.
      </p>
      <pre className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/30 p-4 text-xs leading-6 text-violet-100">
{`Browser → /api/* (Next.js server) → JasaOTP v2 (api_key)
              ↓
       Supabase Auth + Postgres (RLS, ledger, orders)`}
      </pre>

      <h2>Endpoint provider yang digunakan</h2>
      <p>
        Base URL tetap: <code>https://api.jasaotp.id/v2/</code>. Aplikasi tidak membuat endpoint provider lain dan tidak menerima URL bebas dari pengguna.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">Metode</th><th className="p-3">Endpoint</th><th className="p-3">Autentikasi</th><th className="p-3">Respons</th></tr>
          </thead>
          <tbody>
            {providerRoutes.map(([method, route, auth, response]) => (
              <tr key={route} className="border-t border-white/[0.06] align-top">
                <td className="p-3"><Badge variant="cyan">{method}</Badge></td>
                <td className="p-3 font-mono text-xs text-white">{route}</td>
                <td className="p-3 text-xs">{auth}</td>
                <td className="p-3 text-xs">{response}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Kesuksesan tidak ditentukan hanya dari HTTP 200. Parser memeriksa field <code>success</code>, struktur <code>data</code>, nomor telepon, ID pesanan, dan nominal refund sebelum status atau saldo diubah.
      </p>

      <h2>Endpoint internal Kaii OTP</h2>
      <div className="grid gap-2">
        {internalRoutes.map(([method, route, description]) => (
          <div key={`${method}:${route}`} className="glass flex flex-col gap-1 rounded-xl p-3 sm:flex-row sm:items-center sm:gap-4">
            <Badge variant="default" className="w-fit font-mono text-[10px]">{method}</Badge>
            <code className="text-xs text-white">{route}</code>
            <span className="text-xs text-muted-foreground sm:ml-auto">{description}</span>
          </div>
        ))}
      </div>
      <p>
        Deskripsi mesin untuk endpoint internal tersedia di <Link href="/openapi.json">/openapi.json</Link>.
      </p>

      <h2>Aturan penting</h2>
      <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li><strong>Idempotensi:</strong> header <code>Idempotency-Key</code> wajib untuk POST /api/orders dan POST /api/orders/&#123;id&#125;/cancel.</li>
        <li><strong>Harga:</strong> browser tidak boleh mengirim harga. Server mengambil harga terbaru dari /layanan.php dan mendebit nilai itu.</li>
        <li><strong>Refund:</strong> hanya diproses jika /cancel.php mengembalikan <code>success: true</code> dan <code>refunded_amount</code> yang valid.</li>
        <li><strong>Timeout:</strong> hasil yang tidak dapat dipastikan ditandai <em>Perlu ditinjau</em>; pengguna diminta tidak mengulangi aksi.</li>
        <li><strong>OTP:</strong> hanya kode yang ditampilkan, bukan respons mentah. Kode dihapus setelah 15 menit.</li>
        <li><strong>Deposit:</strong> manual dan diverifikasi admin. Tidak ada klaim pembayaran otomatis.</li>
      </ul>

      <h2>Instalasi singkat</h2>
      <pre className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/30 p-4 text-xs leading-6 text-violet-100">
{`cp .env.example .env.local
# isi variabel Supabase dan JASAOTP_API_KEY
# jalankan SQL: supabase/migrations/202610270001_initial.sql
npm install
npm run dev`}
      </pre>
      <p>
        Panduan lengkap Supabase, Vercel, dan administrasi ada di <Link href="https://github.com/HOOOOOOQ/otpotp#readme">README repository</Link>. Halaman <Link href="/konfigurasi">konfigurasi</Link> menampilkan variabel mana yang belum terisi tanpa membocorkan nilainya.
      </p>
    </MarketingPageShell>
  );
}
