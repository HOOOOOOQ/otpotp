import Link from "next/link";
import { Github, Mail } from "lucide-react";
import { Brand } from "@/components/brand";
import { BRAND } from "@/lib/constants";

export function LandingFooter() {
  return (
    <footer className="mt-24 border-t border-white/[0.07] bg-black/20">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Brand />
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">
            {BRAND.tagline} Nomor virtual untuk verifikasi SMS dengan kendali penuh pada setiap pesanan.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Harga, stok, negara, operator, dan OTP ditampilkan dari respons provider yang sebenarnya.
          </p>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold">Produk</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li><Link className="hover:text-white" href="/dashboard/beli">Beli OTP</Link></li>
            <li><Link className="hover:text-white" href="/dashboard/pesanan">Pesanan Saya</Link></li>
            <li><Link className="hover:text-white" href="/dashboard/transaksi">Riwayat Transaksi</Link></li>
            <li><Link className="hover:text-white" href="/dashboard/deposit">Deposit Manual</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold">Sumber Daya</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li><Link className="hover:text-white" href="/dokumentasi">Dokumentasi</Link></li>
            <li><Link className="hover:text-white" href="/api/health">Status Konfigurasi</Link></li>
            <li><Link className="hover:text-white" href="/#faq">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold">Legal & Kontak</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li><Link className="hover:text-white" href="/kebijakan-privasi">Kebijakan Privasi</Link></li>
            <li><Link className="hover:text-white" href="/ketentuan-layanan">Ketentuan Layanan</Link></li>
            <li><Link className="inline-flex items-center gap-2 hover:text-white" href="/kontak"><Mail className="h-4 w-4" /> Kontak</Link></li>
            <li><a className="inline-flex items-center gap-2 hover:text-white" href="https://github.com/HOOOOOOQ/otpotp" target="_blank" rel="noreferrer"><Github className="h-4 w-4" /> Repository</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.06] py-5">
        <div className="container flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Kaii OTP. Seluruh hak dilindungi.</p>
          <p>Dibangun dengan Next.js, Supabase, dan JasaOTP API v2.</p>
        </div>
      </div>
    </footer>
  );
}
