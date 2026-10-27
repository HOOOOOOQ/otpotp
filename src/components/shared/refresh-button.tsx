"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RefreshButton({
  onClick,
  loading = false,
  label = "Muat ulang",
  className,
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={loading} className={cn(className)}>
      <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
