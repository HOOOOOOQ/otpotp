import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Globe2,
  Layers3,
  Radio,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatIDR, formatNumber } from "@/lib/format";
import type { LandingStats } from "@/lib/types";

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function Hero({ stats, isAuthenticated }: { stats: LandingStats; isAuthenticated: boolean }) {
  const primaryHref = isAuthenticated ? "/dashboard/beli" : "/register";
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-70" />
      <div className="container relative grid gap-12 pb-16 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:pb-24 lg:pt-24">
        <div className="animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/[0.07] px-3.5 py-1.5 text-xs font-semibold text-violet-200">
            <Sparkles className="h-3.5 w-3.5" />
            Katalog live langsung dari provider
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-gradient">OTP Instan,</span>
            <br />
            Tanpa Ribet.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Sewa nomor virtual untuk menerima SMS OTP. Pilih negara, aplikasi, dan operator; pantau kode masuk dari satu dashboard yang aman dan transparan.
          </p>
          <p className="mt-3 text-sm font-medium text-violet-200/90">{`“Your Number. Your Code. Your Control.”`}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="group">
              <Link href={primaryHref}>
                Mulai Sekarang <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#layanan">Lihat Layanan</Link>
            </Button>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-emerald-300" /> API key hanya di server</span>
            <span className="inline-flex items-center gap-2"><Radio className="h-4 w-4 text-cyan-300" /> Status OTP dipantau berkala</span>
            <span className="inline-flex items-center gap-2"><Layers3 className="h-4 w-4 text-violet-300" /> Ledger saldo atomik</span>
          </div>
        </div>

        <div className="animate-fade-up [animation-delay:120ms]">
          <div className="glass-strong glow-border relative overflow-hidden rounded-3xl p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">Live catalog</p>
                <h2 className="mt-1 text-lg font-bold">Data provider saat ini</h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                <Globe2 className="h-5 w-5" />
              </div>
            </div>
            <div className="relative mt-5 grid grid-cols-2 gap-3">
              <Stat
                label="Negara"
                value={stats.available ? formatNumber(stats.countries) : "—"}
                hint="Dari endpoint /negara.php"
              />
              <Stat
                label="Layanan"
                value={stats.services === null ? "—" : formatNumber(stats.services)}
                hint={stats.sampleCountry ? `Untuk ${stats.sampleCountry.name}` : "Katalog belum tersedia"}
              />
              <Stat
                label="Operator"
                value={stats.operators === null ? "—" : formatNumber(stats.operators)}
                hint="Pilihan dinamis"
              />
              <Stat
                label="Harga terendah"
                value={stats.lowestPriceIdr === null ? "—" : formatIDR(stats.lowestPriceIdr)}
                hint="Dari layanan tersedia"
              />
            </div>
            <div className="relative mt-5 rounded-xl border border-white/[0.07] bg-black/20 p-3 text-xs leading-5 text-muted-foreground">
              {stats.available ? (
                <>
                  Data diambil langsung dari API JasaOTP v2. Diperbarui{" "}
                  {formatDateTime(stats.updatedAt)} WIB.{" "}
                  {stats.error && <span className="text-amber-200">{stats.error}</span>}
                </>
              ) : (
                <span className="text-amber-200">
                  {stats.error ?? "Katalog provider sedang tidak tersedia. Statistik tidak ditampilkan."}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
