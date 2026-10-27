import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Ketentuan Layanan" };

export default function TermsPage() {
  return (
    <MarketingPageShell
      eyebrow="Legal"
      title="Ketentuan Layanan"
      description="Aturan penggunaan layanan nomor virtual Kaii OTP, saldo pengguna, pembatalan, dan batas tanggung jawab."
    >
      <Alert variant="warning">
        <AlertTitle>Gunakan secara bertanggung jawab</AlertTitle>
        <AlertDescription>
          Nomor virtual hanya boleh dipakai untuk verifikasi yang Anda miliki haknya. Dilarang menggunakan layanan untuk penipuan, spam, pembuatan akun palsu massal, atau pelanggaran hukum dan ketentuan aplikasi tujuan.
        </AlertDescription>
      </Alert>

      <h2>Akun dan akses</h2>
      <p>
        Pengguna bertanggung jawab menjaga kerahasiaan email dan kata sandi. Satu akun digunakan oleh satu pengguna. Akses dashboard dilindungi sesi server; jangan membagikan cookie atau kredensial login Anda.
      </p>

      <h2>Saldo pengguna</h2>
      <p>
        Saldo Kaii OTP adalah dompet internal yang terpisah dari saldo operasional provider. Saldo hanya bertambah setelah admin memverifikasi deposit manual. Aplikasi tidak mengklaim pembayaran otomatis karena dokumentasi JasaOTP v2 tidak menyediakan endpoint deposit pengguna akhir. Saldo tidak dapat diubah langsung oleh permintaan browser.
      </p>

      <h2>Harga dan pesanan</h2>
      <p>
        Harga, stok, negara, layanan, dan operator ditampilkan dari respons provider. Harga diverifikasi ulang di server sesaat sebelum pembelian. Saldo didebit secara atomik, dan kunci idempotensi mencegah pembelian ganda akibat klik berulang. Jika provider menolak pesanan secara tegas, debit dibatalkan melalui ledger refund.
      </p>

      <h2>OTP dan pembatalan</h2>
      <p>
        Kode OTP ditampilkan hanya setelah provider mengembalikan data yang valid. Jika SMS tidak masuk, pesanan yang masih menunggu dapat dibatalkan. Refund hanya diberikan sesuai nominal yang dikonfirmasi resmi oleh endpoint pembatalan provider. Jika hasil provider tidak dapat dipastikan karena timeout, status pesanan ditandai untuk ditinjau dan pengguna tidak boleh mengulangi pembatalan.
      </p>

      <h2>Keterbatasan layanan</h2>
      <p>
        Kaii OTP tidak menjamin bahwa aplikasi tujuan akan mengirim SMS, menerima nomor virtual, atau mengirimkan kode dalam waktu tertentu. Countdown hanya ditampilkan jika provider menyediakan waktu kedaluwarsa. Gangguan provider ditampilkan sebagai pesan error, bukan data rekaan.
      </p>

      <h2>Perubahan layanan</h2>
      <p>
        Operator dapat mengubah harga tampilan sesuai perubahan provider, menonaktifkan fitur untuk pemeliharaan, atau menyesuaikan integrasi bila kontrak API berubah. Perubahan material pada ketentuan ini akan ditampilkan pada halaman yang sama.
      </p>

      <h2>Kontak</h2>
      <p>
        Pertanyaan, laporan kendala, atau permintaan peninjauan dapat dikirim melalui halaman <Link href="/kontak">kontak</Link>.
      </p>
    </MarketingPageShell>
  );
}
