import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Boxes,
  ClipboardCheck,
  CreditCard,
  Gauge,
  MousePointerClick,
  Search,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ServiceIcon } from "@/components/catalog/service-icon";
import { formatIDR, formatNumber } from "@/lib/format";
import type { LandingStats } from "@/lib/types";

const features = [
  {
    icon: Gauge,
    title: "Proses cepat",
    description: "Negara, layanan, dan operator diambil langsung dari katalog provider tanpa data statis.",
  },
  {
    icon: CreditCard,
    title: "Harga transparan",
    description: "Harga diverifikasi ulang di server dari API provider sebelum saldo Anda didebit.",
  },
  {
    icon: BellRing,
    title: "Pemantauan OTP",
    description: "Polling efisien berhenti saat kode diterima atau pesanan mencapai status akhir.",
  },
  {
    icon: ClipboardCheck,
    title: "Pengelolaan pesanan",
    description: "Detail, riwayat, pembatalan, dan ledger transaksi terikat pada akun Anda.",
  },
];

const steps = [
  {
    icon: Wallet,
    title: "Siapkan saldo",
    description: "Ajukan deposit manual. Saldo hanya bertambah setelah administrator memverifikasi pembayaran.",
  },
  {
    icon: MousePointerClick,
    title: "Pilih nomor",
    description: "Cari negara dan aplikasi, pilih operator, lalu konfirmasi harga terbaru dari provider.",
  },
  {
    icon: Smartphone,
    title: "Terima kode",
    description: "Gunakan nomor pada aplikasi tujuan. Kode OTP muncul di halaman detail setelah SMS masuk.",
  },
];

export function FeaturesSection() {
  return (
    <section id="keunggulan" className="container scroll-mt-24 py-16 sm:py-20">
      <div className="mb-10 max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Kenapa Kaii OTP</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Kontrol penuh, tanpa tebakan.</h2>
        <p className="mt-4 leading-7 text-muted-foreground">
          Setiap angka dan status berasal dari data nyata. Tidak ada stok palsu, tidak ada OTP rekaan, dan tidak ada API key di browser.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className="glass group rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-violet-400/25 animate-fade-up"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 transition-colors group-hover:bg-violet-500/20">
              <feature.icon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ServicesSection({ stats }: { stats: LandingStats }) {
  return (
    <section id="layanan" className="container scroll-mt-24 py-16 sm:py-20">
      <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Katalog langsung</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Layanan dari provider.</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            {stats.sampleCountry
              ? `Contoh layanan dengan stok tersedia untuk ${stats.sampleCountry.name}. Harga dan stok mengikuti respons API terbaru.`
              : "Katalog provider sedang tidak tersedia. Tidak ada contoh harga yang dibuat-buat."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/beli">
            Lihat semua layanan <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      {stats.featuredServices.length === 0 ? (
        <div className="glass rounded-2xl">
          <EmptyState
            icon={Search}
            title="Belum ada layanan yang bisa ditampilkan"
            description="Provider belum mengembalikan katalog saat ini. Buka halaman Beli OTP setelah koneksi provider pulih untuk memuat ulang data."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/beli">Buka katalog</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.featuredServices.map((service, index) => (
            <div
              key={service.code}
              className="glass rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-cyan-400/25 animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <ServiceIcon code={service.code} name={service.name} />
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  {service.code}
                </span>
              </div>
              <h3 className="mt-5 text-base font-bold">{service.name}</h3>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Harga provider</p>
                  <p className="mt-1 text-lg font-extrabold text-white">{formatIDR(service.priceIdr)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Stok</p>
                  <p className="mt-1 text-sm font-bold text-emerald-300">{formatNumber(service.stock)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function StepsSection() {
  return (
    <section id="cara-kerja" className="container scroll-mt-24 py-16 sm:py-20">
      <div className="mb-10 max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Cara kerja</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Tiga langkah sampai kode masuk.</h2>
      </div>
      <div className="relative grid gap-4 md:grid-cols-3">
        <div className="pointer-events-none absolute left-[16%] right-[16%] top-10 hidden h-px bg-gradient-to-r from-violet-500/50 via-cyan-400/40 to-violet-500/50 md:block" />
        {steps.map((step, index) => (
          <div key={step.title} className="glass relative rounded-2xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-400/20 bg-[#0c1020] text-violet-300">
                <step.icon className="h-5 w-5" />
              </div>
              <span className="text-4xl font-extrabold text-white/[0.06]">0{index + 1}</span>
            </div>
            <h3 className="text-lg font-bold">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> RLS Supabase</span>
        <span className="inline-flex items-center gap-2"><Boxes className="h-4 w-4 text-violet-300" /> Idempotensi pesanan</span>
        <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-300" /> CSRF & rate limiting</span>
      </div>
    </section>
  );
}

export function CtaSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="container py-10">
      <div className="glass-strong relative overflow-hidden rounded-3xl px-6 py-10 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Siap memulai</p>
            <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">Satu dashboard untuk semua nomor OTP Anda.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Buat akun, ajukan deposit manual, lalu beli nomor dari katalog live provider.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href={isAuthenticated ? "/dashboard/beli" : "/register"}>
              {isAuthenticated ? "Beli nomor sekarang" : "Buat akun gratis"} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
