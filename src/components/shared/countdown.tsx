"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const parts = [hours, minutes, seconds].map((part) => String(part).padStart(2, "0"));
  return parts.join(":");
}

/** Rendered only when the provider actually supplied an expiry timestamp. */
export function Countdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const target = new Date(expiresAt).getTime();
  if (!Number.isFinite(target)) return null;
  const remaining = target - now;
  return (
    <Alert variant={remaining > 60_000 ? "default" : "warning"} className="flex items-center gap-3">
      <Clock3 className="h-5 w-5 shrink-0" />
      <AlertDescription className="flex w-full items-center justify-between gap-3">
        <span>{remaining > 0 ? "Masa berlaku dari penyedia" : "Masa berlaku penyedia telah berakhir"}</span>
        <strong className="font-mono text-base tabular-nums">{formatRemaining(remaining)}</strong>
      </AlertDescription>
    </Alert>
  );
}
