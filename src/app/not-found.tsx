import { Compass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main-content" className="container flex min-h-screen items-center justify-center px-5 py-16">
      <div className="glass glow-border max-w-lg rounded-3xl p-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
          <Compass className="h-7 w-7" />
        </div>
        <p className="text-sm font-semibold tracking-[0.2em] text-violet-300">404</p>
        <h1 className="mt-2 text-2xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Tautan mungkin sudah berubah. Kembali ke beranda atau buka dashboard Anda.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">Ke beranda</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Ke dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
