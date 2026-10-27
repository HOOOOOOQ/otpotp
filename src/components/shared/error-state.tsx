"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Data belum dapat dimuat",
  message,
  onRetry,
  retrying = false,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div className="flex-1">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying} className="shrink-0">
          <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} />
          {retrying ? "Memuat" : "Coba lagi"}
        </Button>
      )}
    </Alert>
  );
}
