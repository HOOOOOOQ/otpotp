import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Kebijakan Privasi" };

export default function PrivacyPage() {
  return (
    <MarketingPageShell
      eyebrow="Legal"
      title="Kebijakan Privasi"
      description="Penjelasan transparan tentang data yang disimpan Kaii OTP, mengapa data itu dibutuhkan, dan berapa lama data sensitif disimpan."
    >
      <Alert variant="info">
        <AlertTitle>Catatan operator</AlertTitle>
        <AlertDescription>
          Sebelum produksi, operator situs wajib menambahkan identitas badan usaha/perorangannya sendiri dan kontak resmi pada halaman ini serta halaman ketentuan. Teks ini tidak mengarang identitas perusahaan.
        </AlertDescription>
      </Alert>

      <h2>Data yang disimpan</h2>
      <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li><strong>Akun:</strong> ID Supabase Auth, email, nama tampilan, peran, dan saldo.</li>
        <li><strong>Pesanan:</strong> ID pesanan provider, nomor virtual, negara, layanan, operator, harga saat transaksi, status, dan waktu.</li>
        <li><strong>Ledger:</strong> setiap debit pembelian, refund, dan deposit terverifikasi.</li>
        <li><strong>Deposit manual:</strong> nominal, referensi pembayaran, catatan, dan status verifikasi.</li>
        <li><strong>Pesan kontak:</strong> nama, email, subjek, isi pesan, dan status peninjauan.</li>
      </ul>

      <h2>Data yang tidak disimpan</h2>
      <p>
        API key provider tidak pernah disimpan di database yang dapat dibaca pengguna, tidak dikirim ke browser, dan tidak ditulis pada log. Kata sandi dikelola Supabase Auth dan tidak pernah disimpan pada tabel aplikasi. Respons mentah SMS tidak ditampilkan dan tidak disimpan.
      </p>

      <h2>Kode OTP</h2>
      <p>
        Hanya kode yang berhasil diekstrak dari respons provider yang disimpan sementara, maksimal <strong>15 menit</strong>, agar pengguna dapat menyalinnya saat berpindah halaman. Setelah itu kode dihapus otomatis oleh fungsi pembersihan. Kode tidak ditulis ke log operasional. Jangan mengirim kode OTP, kata sandi, atau API key melalui formulir kontak.
      </p>

      <h2>Keamanan</h2>
      <p>
        Supabase Row Level Security membatasi pembacaan profil, pesanan, transaksi, dan deposit hanya untuk pemiliknya. Fungsi SQL atomik digunakan untuk debit, refund, klaim pembatalan, dan verifikasi deposit. Endpoint sensitif memakai validasi input, pembatasan laju, pemeriksaan same-origin/CSRF, dan otorisasi berbasis sesi server.
      </p>

      <h2>Pihak ketiga</h2>
      <p>
        Untuk membuat nomor dan membaca OTP, data pesanan minimum dikirim ke JasaOTP API v2. Supabase digunakan untuk autentikasi dan database. Vercel digunakan untuk hosting. Operator bertanggung jawab atas kebijakan retensi akun pihak ketiga tersebut.
      </p>

      <h2>Hak pengguna</h2>
      <p>
        Pengguna dapat melihat data pesanan dan transaksinya pada dashboard. Permintaan koreksi atau penghapusan akun dapat dikirim melalui halaman <Link href="/kontak">kontak</Link>. Beberapa catatan transaksi mungkin tetap disimpan jika diwajibkan untuk pembukuan atau penyelesaian sengketa.
      </p>
    </MarketingPageShell>
  );
}
