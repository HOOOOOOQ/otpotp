"use client";

import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-5">
      <ErrorState
        title="Dashboard tidak dapat dimuat"
        message="Data pesanan atau saldo belum bisa diambil. Detail teknis disembunyikan untuk menjaga keamanan."
        onRetry={reset}
      />
      <div className="glass flex flex-col items-start gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
          <p className="text-sm text-muted-foreground">
            Jika kendala berulang, periksa halaman konfigurasi atau hubungi administrator.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Coba lagi
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/"><Home className="h-4 w-4" /> Beranda</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
