"use client";

import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" className="container flex min-h-screen items-center justify-center px-5 py-16">
      <div className="glass glow-border w-full max-w-lg rounded-3xl p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">Halaman tidak dapat dimuat</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Terjadi kendala tak terduga. Detail teknis disembunyikan demi keamanan. Coba muat ulang atau kembali ke beranda.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Coba lagi
          </Button>
          <Button asChild variant="outline">
            <Link href="/" className="gap-2">
              <Home className="h-4 w-4" /> Beranda
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
