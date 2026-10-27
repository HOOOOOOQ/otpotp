import Link from "next/link";
import { ArrowLeft, BadgeCheck, LockKeyhole, Radio, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { BRAND } from "@/lib/constants";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-60" />
      <div className="pointer-events-none absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="container relative grid min-h-screen gap-10 py-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-16 lg:py-14">
        <div className="hidden lg:block">
          <Brand />
          <div className="mt-20 max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">{BRAND.tagline}</p>
            <h2 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight">
              Nomor virtual. <span className="text-gradient">Kode verifikasi.</span> Satu kendali.
            </h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              Dashboard Kaii OTP memantau pesanan, saldo, dan kode OTP dari katalog provider yang sebenarnya.
            </p>
            <div className="mt-9 space-y-4">
              {[
                { icon: ShieldCheck, text: "API key hanya disimpan pada server" },
                { icon: LockKeyhole, text: "Sesi aman berbasis cookie Supabase" },
                { icon: Radio, text: "Pemantauan OTP berhenti saat selesai" },
                { icon: BadgeCheck, text: "Ledger saldo dan refund terverifikasi" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                    <item.icon className="h-4 w-4" />
                  </div>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Brand />
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Beranda
            </Link>
          </div>
          <div className="glass-strong glow-border rounded-3xl p-6 sm:p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            {children}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Dengan melanjutkan, Anda menyetujui{" "}
            <Link href="/ketentuan-layanan" className="text-violet-300 hover:underline">Ketentuan Layanan</Link>{" "}
            dan{" "}
            <Link href="/kebijakan-privasi" className="text-violet-300 hover:underline">Kebijakan Privasi</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
