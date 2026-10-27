"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Salin",
  successLabel = "Tersalin",
  variant = "outline",
  size = "sm",
  className,
  disabled,
  iconOnly = false,
}: {
  value: string | null | undefined;
  label?: string;
  successLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  disabled?: boolean;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isDisabled = disabled || !value;

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    toast.success(successLabel);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={copy}
      disabled={isDisabled}
      className={cn(className)}
      aria-label={iconOnly ? label || "Salin" : undefined}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {!iconOnly && (copied ? "Tersalin" : label)}
    </Button>
  );
}
